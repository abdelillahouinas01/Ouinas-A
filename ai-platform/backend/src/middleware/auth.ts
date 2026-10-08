// Authentication middleware
import { Request, Response, NextFunction } from 'express';
import { getUserFromToken, verifyDeveloperSession } from '../utils/auth';
import { User, AuthenticatedRequest } from '../types';

// Extend Express Request to include user and developer info
declare global {
  namespace Express {
    interface Request extends AuthenticatedRequest {
      user?: User;
      isDeveloper?: boolean;
    }
  }
}

// Extract token from cookie or Authorization header
function extractToken(req: Request): string | null {
  // Try Authorization header first
  const authHeader = req.get('Authorization');
  if (authHeader && authHeader.startsWith('Bearer ')) {
    return authHeader.slice(7);
  }

  // Try cookie
  return req.cookies?.sessionToken || null;
}

// Middleware to verify user authentication
export async function authenticateUser(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const token = extractToken(req);

    if (!token) {
      res.status(401).json({
        error: 'UNAUTHORIZED',
        message: 'Authentication required',
      });
      return;
    }

    const user = await getUserFromToken(token);

    if (!user) {
      res.status(401).json({
        error: 'UNAUTHORIZED',
        message: 'Invalid or expired session',
      });
      return;
    }

    if (user.disabled) {
      res.status(403).json({
        error: 'FORBIDDEN',
        message: 'User account is disabled',
      });
      return;
    }

    req.user = user;
    next();
  } catch (error) {
    res.status(401).json({
      error: 'UNAUTHORIZED',
      message: 'Authentication failed',
    });
  }
}

// Middleware to verify developer authentication
export async function authenticateDeveloper(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const token = extractToken(req);

    if (!token) {
      res.status(401).json({
        error: 'UNAUTHORIZED',
        message: 'Developer authentication required',
      });
      return;
    }

    const isValid = await verifyDeveloperSession(token);

    if (!isValid) {
      res.status(401).json({
        error: 'UNAUTHORIZED',
        message: 'Invalid or expired developer session',
      });
      return;
    }

    req.isDeveloper = true;
    next();
  } catch (error) {
    res.status(401).json({
      error: 'UNAUTHORIZED',
      message: 'Developer authentication failed',
    });
  }
}

// Middleware to optionally authenticate (doesn't fail if not authenticated)
export async function optionalAuth(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const token = extractToken(req);

    if (token) {
      const user = await getUserFromToken(token);
      if (user && !user.disabled) {
        req.user = user;
      }
    }

    next();
  } catch (error) {
    // Continue without user
    next();
  }
}
