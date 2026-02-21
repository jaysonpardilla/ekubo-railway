import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

export interface AuthRequest extends Request {
  userId?: string;
  userType?: string;
}

interface JWTPayload {
  userId: string;
  userType: string;
}

export function authenticateToken(req: AuthRequest, res: Response, next: NextFunction) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Access token required' });
  }

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET!) as JWTPayload;
    req.userId = payload.userId;
    req.userType = payload.userType;
    next();
  } catch (error) {
    return res.status(403).json({ error: 'Invalid or expired token' });
  }
}

export function requireRole(...roles: string[]) {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.userType || !roles.includes(req.userType)) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }
    next();
  };
}
