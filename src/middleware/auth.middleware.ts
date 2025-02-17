import { NextFunction, Response } from 'express';
import { UnauthorizedError } from '@common/errors/http-status.error';
import { verifyToken } from '@modules/iam/services/token.service';
import { ActiveUserData, AuthRequest } from '@modules/iam/types/auth.types';
import logger from '@common/log/app.log';
import { TokenType } from '@modules/iam/enums/token-type.enum';

export const authMiddleware = async (
  req: AuthRequest,
  _res: Response,
  next: NextFunction,
) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    throw new UnauthorizedError('Unauthorized - Missing token');
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = await verifyToken(token);

    if (decoded.tokenType !== TokenType.AUTH) {
      throw new UnauthorizedError('Wrong token type');
    }

    const activeUser: ActiveUserData = {
      sub: decoded.sub,
      organizationId: decoded.organizationId,
      email: decoded.email,
      role: decoded.role,
    };

    req.activeUser = activeUser;

    next();
  } catch (error) {
    logger.warn('Token verification failed', {
      error: error instanceof Error ? error.message : String(error),
      maskedToken: token.substring(0, 10) + '...',
      ip: req.ip,
      url: req.originalUrl,
    });

    throw new UnauthorizedError('Unauthorized - Invalid token');
  }
};
