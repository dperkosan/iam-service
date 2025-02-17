import { Router } from 'express';
import { handleRouteErrors } from '@middleware/error.middleware';
import { authMiddleware } from '@middleware/auth.middleware';
import { roleMiddleware } from '@middleware/role.middleware';
import { example } from '@modules/protected-routes-example/controllers/examples.controller';

const router = Router();

router.get('/public-route', handleRouteErrors(example));

router.get(
  '/auth-route',
  handleRouteErrors(authMiddleware),
  handleRouteErrors(example),
);

router.get(
  '/auth-route-admin-only',
  handleRouteErrors(authMiddleware),
  handleRouteErrors(roleMiddleware(['admin'])),
  handleRouteErrors(example),
);

export default router;
