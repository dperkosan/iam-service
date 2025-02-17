import { NextFunction, Response } from 'express';
import { ForbiddenError } from '@common/errors/http-status.error';
import { AuthRequest } from '@modules/iam/types/auth.types';

export const roleMiddleware = (allowedRoles: string[]) => {
  return (req: AuthRequest, _res: Response, next: NextFunction) => {
    if (!req.activeUser) {
      // This means `authMiddleware` was not executed before this middleware
      throw new ForbiddenError('Access denied - User not authenticated');
    }

    if (!allowedRoles.includes(req.activeUser.role)) {
      throw new ForbiddenError('Access denied - Insufficient permissions');
    }

    next();
  };
};
