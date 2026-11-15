import { Router } from 'express';
import { appCheckContext } from './firestoreRest';
import {
  DESIGNATED_SUPER_ADMIN_EMAIL,
  DESIGNATED_SUPER_ADMIN_NAME,
} from './routes/authMiddleware';
import { authRoutes } from './routes/authRoutes';
import { adminRoutes } from './routes/adminRoutes';
import { surveyAndNotificationRoutes } from './routes/surveyAndNotificationRoutes';

export { DESIGNATED_SUPER_ADMIN_EMAIL, DESIGNATED_SUPER_ADMIN_NAME };

export const apiRouter = Router();

// Propagate client X-Firebase-AppCheck token across async operations in this request
apiRouter.use((req, _res, next) => {
  const rawHeader = req.headers['x-firebase-appcheck'];
  const appCheckToken = Array.isArray(rawHeader) ? rawHeader[0] : rawHeader;
  appCheckContext.run(
    { appCheckToken: typeof appCheckToken === 'string' ? appCheckToken.trim() : undefined },
    () => next()
  );
});

apiRouter.use(authRoutes);
apiRouter.use(adminRoutes);
apiRouter.use(surveyAndNotificationRoutes);
