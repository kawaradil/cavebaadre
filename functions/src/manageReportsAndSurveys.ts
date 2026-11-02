import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';

/**
 * Cloud Function: adminManageReportStatus
 *
 * صلاحيات الإدارة (Admin & Super Admin) لإدارة البلاغات عبر الخادم:
 * - يتحقق من الدور عبر Firebase Custom Claims (request.auth.token.role)
 * - ينفذ التحديث داخل Firestore Transaction لمنع أي تعارض تزامن (Race Condition)
 * - يحدث الحالة (pending/new -> in_progress/sent -> resolved/completed أو rejected)
 * - يحدد الدائرة المعنية ويسجل إرسال البلاغ واعتماد الإنجاز في CompletedWork
 * - يسجل الحدث في audit_logs
 */
export const adminManageReportStatus = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError(
      'unauthenticated',
      'يجب تسجيل الدخول لتنفيذ هذه العملية الإدارية.'
    );
  }

  const callerUid = context.auth.uid;
  const callerRole = context.auth.token?.role as string | undefined;

  if (callerRole !== 'admin' && callerRole !== 'super_admin') {
    throw new functions.https.HttpsError(
      'permission-denied',
      'غير مصرح: هذه العملية مخصصة لحسابات الإدارة (Admin / Super Admin) فقط.'
    );
  }

  const {
    reportId,
    status,
    assignedTeam,
    assignedRecipient,
    officialNote,
    urgency,
    resolvedImages,
  } = data || {};

  if (!reportId || typeof reportId !== 'string') {
    throw new functions.https.HttpsError('invalid-argument', 'معرّف البلاغ مطلوب.');
  }

  const allowedStatuses = ['pending', 'new', 'in_progress', 'sent', 'resolved', 'completed', 'rejected'];
  if (!status || !allowedStatuses.includes(status)) {
    throw new functions.https.HttpsError('invalid-argument', 'حالة البلاغ المرسلة غير صالحة.');
  }

  // توحيد الحالة المنطقية مع الحالة الفعلية في التطبيق
  const normalizedStatus =
    status === 'new'
      ? 'pending'
      : status === 'sent'
      ? 'in_progress'
      : status === 'completed'
      ? 'resolved'
      : status;

  const db = admin.firestore();
  const reportRef = db.collection('reports').doc(reportId);
  const nowIso = new Date().toISOString();

  const updatedReport = await db.runTransaction(async (transaction) => {
    const snap = await transaction.get(reportRef);
    if (!snap.exists) {
      throw new functions.https.HttpsError('not-found', 'البلاغ المطلوب غير موجود.');
    }

    const current = snap.data() || {};
    const statusTimestamps = {
      ...(current.statusTimestamps || {}),
      [normalizedStatus]: nowIso,
    };
    const statusNotes = {
      ...(current.statusNotes || {}),
      ...(officialNote !== undefined ? { [normalizedStatus]: String(officialNote).trim() } : {}),
    };

    const patch: Record<string, any> = {
      status: normalizedStatus,
      updatedAt: nowIso,
      isOpened: true,
      openedAt: current.openedAt || nowIso,
      statusTimestamps,
      statusNotes,
    };

    if (assignedTeam) patch.assignedTeam = String(assignedTeam).trim();
    if (assignedRecipient) patch.assignedRecipient = String(assignedRecipient).trim();
    if (officialNote !== undefined) {
      patch.officialNote = String(officialNote).trim();
      patch.adminNotes = String(officialNote).trim();
    }
    if (urgency && ['normal', 'high', 'emergency'].includes(urgency)) {
      patch.urgency = urgency;
      patch.isUrgencySet = true;
      patch.urgencySetAt = current.urgencySetAt || nowIso;
    }
    if (normalizedStatus === 'resolved') {
      patch.resolvedAt = nowIso;
      if (Array.isArray(resolvedImages) && resolvedImages.length > 0) {
        patch.resolvedImages = resolvedImages.slice(0, 10);
      }
    }

    // ضمان عدم تغير صاحب البلاغ الأصلي
    if (current.ownerUid) patch.ownerUid = current.ownerUid;
    if (current.citizenId) patch.citizenId = current.citizenId;

    transaction.update(reportRef, patch);

    return {
      ...current,
      ...patch,
      id: reportId,
    };
  });

  await db.collection('audit_logs').add({
    action: 'REPORT_STATUS_UPDATED_BY_ADMIN',
    actorUid: callerUid,
    actorRole: callerRole,
    reportId,
    newStatus: normalizedStatus,
    assignedTeam: assignedTeam || null,
    timestamp: nowIso,
  });

  return {
    success: true,
    report: updatedReport,
  };
});

/**
 * Cloud Function: submitCitizenSurveyResponse
 *
 * حماية الاستبيانات عبر الخادم:
 * - يتحقق من أن المستخدم مسجل الدخول
 * - يتحقق من أن الاستبيان منشور وفعّال
 * - يمنع إرسال إجابة بالنيابة عن مستخدم آخر (يعتمد حصراً على context.auth.uid)
 * - يمنع الإجابة أكثر من مرة لنفس الاستبيان باستخدام المعرّف الحتمي `${surveyId}_${citizenUid}` داخل Firestore Transaction
 */
export const submitCitizenSurveyResponse = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError(
      'unauthenticated',
      'يجب تسجيل الدخول للمشاركة في الاستبيان.'
    );
  }

  const citizenUid = context.auth.uid;
  const { surveyId, selectedOptionsByQuestionId, answers } = data || {};

  if (!surveyId || typeof surveyId !== 'string') {
    throw new functions.https.HttpsError('invalid-argument', 'معرّف الاستبيان مطلوب.');
  }

  if (!selectedOptionsByQuestionId || typeof selectedOptionsByQuestionId !== 'object') {
    throw new functions.https.HttpsError('invalid-argument', 'إجابات الاستبيان مطلوبة.');
  }

  const db = admin.firestore();
  const deterministicResponseId = `${surveyId}_${citizenUid}`;
  const responseRef = db.collection('SurveyResponses').doc(deterministicResponseId);
  const surveyRef = db.collection('surveys').doc(surveyId);
  const nowIso = new Date().toISOString();

  await db.runTransaction(async (transaction) => {
    const existingResp = await transaction.get(responseRef);
    if (existingResp.exists) {
      throw new functions.https.HttpsError(
        'already-exists',
        'لقد قمت بإرسال إجابتك على هذا الاستبيان مسبقاً. لا يُسمح بالإجابة أكثر من مرة.'
      );
    }

    const surveySnap = await transaction.get(surveyRef);
    if (!surveySnap.exists) {
      throw new functions.https.HttpsError('not-found', 'الاستبيان المطلوب غير موجود.');
    }

    const surveyData = surveySnap.data() || {};
    if (!surveyData.isPublishedToCitizens && surveyData.status !== 'active' && surveyData.status !== 'published') {
      throw new functions.https.HttpsError(
        'failed-precondition',
        'هذا الاستبيان غير منشور حالياً للمواطنين.'
      );
    }

    const questionsList = Array.isArray(surveyData.questions) ? surveyData.questions : [];
    const missingAnswers = questionsList.some((q: any) => !selectedOptionsByQuestionId[q.id]);
    if (missingAnswers) {
      throw new functions.https.HttpsError(
        'invalid-argument',
        'يرجى الإجابة على جميع أسئلة الاستبيان قبل الإرسال.'
      );
    }

    const updatedQuestions = questionsList.map((q: any) => {
      const chosenOptId = selectedOptionsByQuestionId[q.id];
      if (!chosenOptId) return q;
      return {
        ...q,
        options: Array.isArray(q.options)
          ? q.options.map((opt: any) =>
              opt.id === chosenOptId
                ? { ...opt, votesCount: (opt.votesCount || 0) + 1 }
                : opt
            )
          : [],
      };
    });

    transaction.set(responseRef, {
      id: deterministicResponseId,
      surveyId,
      surveyTitle: surveyData.title || '',
      citizenUid,
      ownerUid: citizenUid,
      completed: true,
      submittedAt: admin.firestore.FieldValue.serverTimestamp(),
      answers: Array.isArray(answers) ? answers : [],
      selectedOptionsByQuestionId,
      createdAt: nowIso,
    });

    transaction.update(surveyRef, {
      totalResponses: (surveyData.totalResponses || 0) + 1,
      questions: updatedQuestions,
    });
  });

  return {
    success: true,
    responseId: deterministicResponseId,
  };
});
