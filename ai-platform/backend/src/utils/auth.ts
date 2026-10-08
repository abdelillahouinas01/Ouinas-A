// Authentication utilities
import jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';
import { query } from './database';
import { User } from '../types';

const SESSION_SECRET = process.env.SESSION_SECRET || 'dev-secret-key';
const SESSION_EXPIRY_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

export interface TokenPayload {
  userId: string;
  email: string;
  type: 'user' | 'developer';
}

// Create a user session token
export async function createUserSession(userId: string, email: string): Promise<string> {
  const token = jwt.sign(
    { userId, email, type: 'user' },
    SESSION_SECRET,
    { expiresIn: '7d' }
  );

  // Store session in database for revocation support
  const sessionId = uuidv4();
  const expiresAt = new Date(Date.now() + SESSION_EXPIRY_MS);

  await query(
    `INSERT INTO user_sessions (id, user_id, token, expires_at)
     VALUES ($1, $2, $3, $4)`,
    [sessionId, userId, token, expiresAt]
  );

  return token;
}

// Create a developer session token
export async function createDeveloperSession(): Promise<string> {
  const token = jwt.sign(
    { type: 'developer' },
    SESSION_SECRET,
    { expiresIn: '30d' }
  );

  const sessionId = uuidv4();
  const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

  await query(
    `INSERT INTO developer_sessions (id, token, expires_at)
     VALUES ($1, $2, $3)`,
    [sessionId, token, expiresAt]
  );

  return token;
}

// Verify and decode a token
export function verifyToken(token: string): TokenPayload {
  try {
    return jwt.verify(token, SESSION_SECRET) as TokenPayload;
  } catch (error) {
    throw new Error('Invalid or expired token');
  }
}

// Get user from token
export async function getUserFromToken(token: string): Promise<User | null> {
  try {
    const payload = verifyToken(token);

    if (payload.type !== 'user') {
      return null;
    }

    // Verify session still exists in database
    const result = await query(
      `SELECT * FROM user_sessions WHERE token = $1 AND expires_at > NOW()`,
      [token]
    );

    if (result.rows.length === 0) {
      return null;
    }

    // Get user data
    const userResult = await query(
      `SELECT * FROM users WHERE id = $1`,
      [payload.userId]
    );

    return userResult.rows[0] || null;
  } catch (error) {
    return null;
  }
}

// Verify developer session
export async function verifyDeveloperSession(token: string): Promise<boolean> {
  try {
    const payload = verifyToken(token);

    if (payload.type !== 'developer') {
      return false;
    }

    // Verify session still exists and hasn't expired
    const result = await query(
      `SELECT * FROM developer_sessions WHERE token = $1 AND expires_at > NOW()`,
      [token]
    );

    return result.rows.length > 0;
  } catch (error) {
    return false;
  }
}

// Invalidate a user session
export async function invalidateUserSession(token: string): Promise<void> {
  await query(`DELETE FROM user_sessions WHERE token = $1`, [token]);
}

// Invalidate all user sessions for a user
export async function invalidateAllUserSessions(userId: string): Promise<void> {
  await query(`DELETE FROM user_sessions WHERE user_id = $1`, [userId]);
}

// Generate a random token
export function generateToken(): string {
  return uuidv4().replace(/-/g, '');
}
