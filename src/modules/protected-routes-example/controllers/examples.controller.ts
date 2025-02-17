import { Response } from 'express';
import { AuthRequest } from '@modules/iam/types/auth.types';

export const example = async (
  req: AuthRequest,
  res: Response,
): Promise<void> => {
  const user = req.activeUser;

  res.status(200).json({
    message: `User ${user?.email} from org ${user?.organizationId} with role ${user?.role}`,
  });
};
