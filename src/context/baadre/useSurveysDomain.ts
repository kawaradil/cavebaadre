import { useState, useEffect, useCallback, useRef } from 'react';
import {
  collection,
  doc,
  setDoc,
  deleteDoc,
  onSnapshot,
  query,
  where,
  orderBy,
  limit,
} from 'firebase/firestore';
import {
  db,
  auth,
  COLLECTIONS,
  generateAutoNumericId,
  isPureNumericId,
  syncNumericCounterWithItems,
  prepareDocumentWithId,
  executeSurveyResponseTransaction,
  OperationType,
  handleFirestoreError,
} from '../../lib/firebase';
import {
  CommunitySurvey,
  CitizenSurveyResponse,
  SurveyAnswerItem,
} from '../../types/baadre';
import { CreateSurveyInput, CACHE_KEY_SURVEYS } from './types';

export function useSurveysDomain(params: {
  canAccessAdmin: boolean;
  hasFirestoreAdminAuth: boolean;
  currentUserUid?: string;
}) {
  const { canAccessAdmin, hasFirestoreAdminAuth, currentUserUid } = params;

  const [surveys, setSurveys] = useState<CommunitySurvey[]>(() => {
    try {
      const raw = localStorage.getItem(CACHE_KEY_SURVEYS);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch {}
    return [];
  });

  const [surveyResponses, setSurveyResponses] = useState<CitizenSurveyResponse[]>([]);
  const [answeredSurveyIds, setAnsweredSurveyIds] = useState<string[]>([]);
  const [dismissedSurveyIds, setDismissedSurveyIds] = useState<string[]>([]);

  const surveysRef = useRef(surveys);
  surveysRef.current = surveys;
  const answeredSurveyIdsRef = useRef(answeredSurveyIds);
  answeredSurveyIdsRef.current = answeredSurveyIds;

  useEffect(() => {
    let unsubSurveys = () => {};
    let unsubResponses = () => {};

    if (currentUserUid) {
      const surveysQuery = hasFirestoreAdminAuth
        ? query(
            collection(db, COLLECTIONS.SURVEYS),
            orderBy('createdAt', 'desc'),
            limit(50)
          )
        : query(
            collection(db, COLLECTIONS.SURVEYS),
            where('isPublishedToCitizens', '==', true),
            limit(50)
          );
      unsubSurveys = onSnapshot(
        surveysQuery,
        (snapshot) => {
          const numericDocs = snapshot.docs.filter((d) => isPureNumericId(d.id));
          const remoteSurveys = numericDocs
            .map((d) => {
              const data = d.data() as CommunitySurvey;
              return { ...data, id: String(d.id) };
            })
            .sort(
              (a, b) =>
                new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime()
            );
          syncNumericCounterWithItems(COLLECTIONS.SURVEYS, remoteSurveys);
          const targetSurveys = hasFirestoreAdminAuth
            ? remoteSurveys
            : remoteSurveys.filter(
                (s) => Boolean(s.isPublishedToCitizens && s.status !== 'closed')
              );
          setSurveys(targetSurveys);
          try {
            if (hasFirestoreAdminAuth) {
              localStorage.setItem(CACHE_KEY_SURVEYS, JSON.stringify(targetSurveys));
            } else {
              localStorage.removeItem(CACHE_KEY_SURVEYS);
            }
          } catch {}
        },
        () => {}
      );
    } else {
      setSurveys([]);
      try {
        localStorage.removeItem(CACHE_KEY_SURVEYS);
      } catch {}
    }

    if (hasFirestoreAdminAuth) {
      const responsesQuery = query(
        collection(db, COLLECTIONS.SURVEY_RESPONSES),
        orderBy('createdAt', 'desc'),
        limit(100)
      );
      unsubResponses = onSnapshot(
        responsesQuery,
        (snapshot) => {
          const remoteResponses = snapshot.docs.map((d) => {
            const data = d.data() as CitizenSurveyResponse;
            return { ...data, id: String(d.id) };
          });
          syncNumericCounterWithItems(COLLECTIONS.SURVEY_RESPONSES, remoteResponses);
          setSurveyResponses(remoteResponses);
        },
        () => {}
      );
    } else {
      setSurveyResponses([]);
    }

    return () => {
      unsubSurveys();
      unsubResponses();
    };
  }, [hasFirestoreAdminAuth, currentUserUid]);

  useEffect(() => {
    if (!currentUserUid || surveys.length === 0) {
      if (!currentUserUid) {
        setAnsweredSurveyIds([]);
      }
      return;
    }

    const completedSet = new Set<string>();
    const unsubs = surveys.map((survey) => {
      const deterministicResponseId = `${survey.id}_${currentUserUid}`;
      const responseRef = doc(db, COLLECTIONS.SURVEY_RESPONSES, deterministicResponseId);
      return onSnapshot(
        responseRef,
        (snap) => {
          if (snap.exists()) {
            completedSet.add(survey.id);
          } else {
            completedSet.delete(survey.id);
          }
          setAnsweredSurveyIds(Array.from(completedSet));
        },
        () => {}
      );
    });

    return () => {
      unsubs.forEach((unsub) => unsub());
    };
  }, [surveys, currentUserUid]);

  const createSurvey = useCallback(
    (input: CreateSurveyInput): CommunitySurvey => {
      const numericId = generateAutoNumericId(COLLECTIONS.SURVEYS, surveysRef.current);
      const now = new Date().toISOString();
      const newSurvey = prepareDocumentWithId<CommunitySurvey>(
        COLLECTIONS.SURVEYS,
        {
          id: numericId,
          title: input.title.trim().slice(0, 300),
          description: input.description.trim().slice(0, 2000),
          createdAt: now,
          isPublishedToCitizens: false,
          status: 'draft',
          totalResponses: 0,
          questions: input.questions.map((q, qIdx) => ({
            id: String(qIdx + 1),
            questionText: q.questionText.trim(),
            options: q.options
              .map((o) => o.trim())
              .filter(Boolean)
              .map((optText, oIdx) => ({
                id: String(oIdx + 1),
                text: optText,
                votesCount: 0,
              })),
          })),
        },
        numericId
      );
      if (!canAccessAdmin) {
        return newSurvey;
      }
      setSurveys((prev) => [newSurvey, ...prev]);
      setDoc(doc(db, COLLECTIONS.SURVEYS, newSurvey.id), newSurvey).catch((err) => {
        try {
          handleFirestoreError(err, OperationType.CREATE, `${COLLECTIONS.SURVEYS}/${newSurvey.id}`);
        } catch {}
      });
      return newSurvey;
    },
    [canAccessAdmin]
  );

  const updateSurvey = useCallback(
    (surveyId: string, input: CreateSurveyInput) => {
      if (!canAccessAdmin) return;
      setSurveys((prev) =>
        prev.map((s) => {
          if (s.id !== surveyId) return s;
          const updated = prepareDocumentWithId<CommunitySurvey>(
            COLLECTIONS.SURVEYS,
            {
              ...s,
              id: s.id,
              title: input.title.trim().slice(0, 300),
              description: input.description.trim().slice(0, 2000),
              questions: input.questions.map((q, qIdx) => {
                const existingQ = s.questions[qIdx];
                return {
                  id: existingQ && isPureNumericId(existingQ.id) ? existingQ.id : String(qIdx + 1),
                  questionText: q.questionText.trim(),
                  options: q.options
                    .map((o) => o.trim())
                    .filter(Boolean)
                    .map((optText, oIdx) => {
                      const existingOpt = existingQ?.options[oIdx];
                      return {
                        id:
                          existingOpt && isPureNumericId(existingOpt.id)
                            ? existingOpt.id
                            : String(oIdx + 1),
                        text: optText,
                        votesCount: existingOpt ? existingOpt.votesCount : 0,
                      };
                    }),
                };
              }),
            },
            s.id
          );
          setDoc(doc(db, COLLECTIONS.SURVEYS, updated.id), updated, { merge: true }).catch((err) => {
            try {
              handleFirestoreError(
                err,
                OperationType.UPDATE,
                `${COLLECTIONS.SURVEYS}/${updated.id}`
              );
            } catch {}
          });
          return updated;
        })
      );
    },
    [canAccessAdmin]
  );

  const togglePublishSurveyToCitizens = useCallback(
    (surveyId: string, forceState?: boolean) => {
      if (!canAccessAdmin) return;
      setSurveys((prev) =>
        prev.map((s) => {
          if (s.id !== surveyId) return s;
          const nextPublished =
            forceState !== undefined ? forceState : !s.isPublishedToCitizens;
          const nextStatus = nextPublished ? 'active' : 'closed';
          if (nextPublished) {
            setDismissedSurveyIds((ids) => ids.filter((id) => id !== surveyId));
          }
          const updated: CommunitySurvey = {
            ...s,
            id: s.id,
            isPublishedToCitizens: nextPublished,
            status: nextStatus,
          };
          setDoc(
            doc(db, COLLECTIONS.SURVEYS, s.id),
            { id: s.id, isPublishedToCitizens: nextPublished, status: nextStatus },
            { merge: true }
          ).catch((err) => {
            try {
              handleFirestoreError(err, OperationType.UPDATE, `${COLLECTIONS.SURVEYS}/${s.id}`);
            } catch {}
          });
          return updated;
        })
      );
    },
    [canAccessAdmin]
  );

  const deleteSurvey = useCallback(
    (surveyId: string) => {
      if (!canAccessAdmin) return;
      setSurveys((prev) => {
        const next = prev.filter((s) => s.id !== surveyId);
        try {
          localStorage.setItem(CACHE_KEY_SURVEYS, JSON.stringify(next));
        } catch {}
        return next;
      });
      deleteDoc(doc(db, COLLECTIONS.SURVEYS, surveyId)).catch((err) => {
        try {
          handleFirestoreError(err, OperationType.DELETE, `${COLLECTIONS.SURVEYS}/${surveyId}`);
        } catch {}
      });
    },
    [canAccessAdmin]
  );

  const submitSurveyResponse = useCallback(
    (surveyId: string, selectedOptionsByQuestionId: Record<string, string>) => {
      if (answeredSurveyIdsRef.current.includes(surveyId)) {
        return;
      }

      const targetSurvey = surveysRef.current.find((s) => s.id === surveyId);
      const citizenUid =
        auth.currentUser?.uid ||
        (() => {
          const anonKey = 'cave_baadre_device_citizen_uid';
          try {
            let saved = localStorage.getItem(anonKey);
            if (!saved) {
              saved = `anon_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
              localStorage.setItem(anonKey, saved);
            }
            return saved;
          } catch {
            return `anon_${Date.now()}`;
          }
        })();

      const deterministicId = `${surveyId}_${citizenUid}`;
      const now = new Date().toISOString();

      const detailedAnswers: SurveyAnswerItem[] = targetSurvey
        ? targetSurvey.questions
            .map((q) => {
              const chosenOptId = selectedOptionsByQuestionId[q.id];
              const chosenOpt = q.options.find((o) => o.id === chosenOptId);
              if (!chosenOptId) return null;
              return {
                questionId: q.id,
                questionText: q.questionText,
                selectedOptionId: chosenOptId,
                selectedOptionText: chosenOpt?.text || '',
              };
            })
            .filter((item): item is SurveyAnswerItem => item !== null)
        : Object.entries(selectedOptionsByQuestionId).map(([qId, optId]) => ({
            questionId: qId,
            questionText: '',
            selectedOptionId: optId,
            selectedOptionText: '',
          }));

      const newResponseDoc: CitizenSurveyResponse = {
        id: deterministicId,
        surveyId: String(surveyId),
        surveyTitle: targetSurvey?.title || '',
        citizenUid,
        ownerUid: citizenUid,
        answers: detailedAnswers,
        selectedOptionsByQuestionId,
        createdAt: now,
      };

      setSurveyResponses((prev) => [
        newResponseDoc,
        ...prev.filter((r) => r.id !== deterministicId),
      ]);

      setSurveys((prev) =>
        prev.map((s) => {
          if (s.id !== surveyId) return s;
          return prepareDocumentWithId<CommunitySurvey>(
            COLLECTIONS.SURVEYS,
            {
              ...s,
              id: s.id,
              totalResponses: s.totalResponses + 1,
              questions: s.questions.map((q) => {
                const selectedOptId = selectedOptionsByQuestionId[q.id];
                if (!selectedOptId) return q;
                return {
                  ...q,
                  options: q.options.map((opt) =>
                    opt.id === selectedOptId
                      ? { ...opt, votesCount: opt.votesCount + 1 }
                      : opt
                  ),
                };
              }),
            },
            s.id
          );
        })
      );

      setAnsweredSurveyIds((prev) =>
        prev.includes(surveyId) ? prev : [...prev, surveyId]
      );
      setDismissedSurveyIds((prev) =>
        prev.includes(surveyId) ? prev : [...prev, surveyId]
      );

      executeSurveyResponseTransaction({
        surveyId: String(surveyId),
        citizenUid,
        responseDoc: newResponseDoc,
        selectedOptionsByQuestionId,
      }).catch((err) => {
        try {
          handleFirestoreError(
            err,
            OperationType.CREATE,
            `${COLLECTIONS.SURVEY_RESPONSES}/${deterministicId}`
          );
        } catch {}
      });
    },
    []
  );

  const dismissSurveyPopup = useCallback((surveyId: string) => {
    setDismissedSurveyIds((prev) =>
      prev.includes(surveyId) ? prev : [...prev, surveyId]
    );
  }, []);

  const reopenPublishedSurveysPopup = useCallback(() => {
    setDismissedSurveyIds([]);
  }, []);

  return {
    surveys: canAccessAdmin
      ? surveys
      : surveys.filter((s) => Boolean(s.isPublishedToCitizens && s.status !== 'closed')),
    surveyResponses: canAccessAdmin ? surveyResponses : [],
    answeredSurveyIds,
    dismissedSurveyIds,
    createSurvey,
    updateSurvey,
    togglePublishSurveyToCitizens,
    deleteSurvey,
    submitSurveyResponse,
    dismissSurveyPopup,
    reopenPublishedSurveysPopup,
  };
}
