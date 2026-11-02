import * as admin from 'firebase-admin';

// Initialize Firebase Admin SDK for Cloud Functions environment
if (!admin.apps.length) {
  admin.initializeApp();
}

export { bootstrapFirstSuperAdmin } from './bootstrapSuperAdmin';
export { changeUserRole } from './changeUserRole';
export { revealAdminRecoveryCode } from './revealAdminRecoveryCode';
export {
  verifyAdminRecoveryCode,
  requestPasswordResetLink,
} from './verifyAdminRecoveryCode';
export {
  adminManageReportStatus,
  submitCitizenSurveyResponse,
} from './manageReportsAndSurveys';
export {
  onNewReportCreatedNotifyAdmins,
  notifyAdminsOnNewReport,
  buildSanitizedReportNotificationPayload,
  dispatchNewReportNotificationToAllAdmins,
} from './notifyAdminsOnNewReport';


