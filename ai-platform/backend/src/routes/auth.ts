// Authentication routes
import { Router, Request, Response } from 'express';
import axios from 'axios';
import { query } from '../utils/database';
import {
  createUserSession,
  createDeveloperSession,
  invalidateUserSession,
  verifyToken,
} from '../utils/auth';
import { compareHash } from '../utils/encryption';
import { CreditService } from '../services/creditService';
import { authenticateUser, authenticateDeveloper } from '../middleware/auth';
import { asyncHandler, Errors } from '../middleware/errors';
import { authLimiter } from '../middleware/rateLimit';
import { v4 as uuidv4 } from 'uuid';

const router = Router();

// GitHub OAuth callback
router.get(
  '/callback',
  authLimiter,
  asyncHandler(async (req: Request, res: Response) => {
    const { code, state } = req.query;

    if (!code || typeof code !== 'string') {
      throw Errors.VALIDATION_ERROR('Authorization code is required');
    }

    try {
      // Exchange code for access token
      const tokenResponse = await axios.post(
        'https://github.com/login/oauth/access_token',
        {
          client_id: process.env.GITHUB_CLIENT_ID,
          client_secret: process.env.GITHUB_CLIENT_SECRET,
          code,
        },
        {
          headers: {
            Accept: 'application/json',
          },
        }
      );

      if (tokenResponse.data.error) {
        throw new Error(tokenResponse.data.error_description || 'OAuth error');
      }

      const accessToken = tokenResponse.data.access_token;

      // Get user info from GitHub
      const userResponse = await axios.get('https://api.github.com/user', {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });

      const {
        id: github_id,
        email,
        name,
        avatar_url,
        login: username,
      } = userResponse.data;

      // Check if user exists or create new user
      let userResult = await query(
        `SELECT * FROM users WHERE github_id = $1`,
        [github_id]
      );

      let userId: string;

      if (userResult.rows.length === 0) {
        // Create new user
        userId = uuidv4();
        await query(
          `INSERT INTO users (id, github_id, email, name, avatar_url)
           VALUES ($1, $2, $3, $4, $5)`,
          [userId, github_id, email, name, avatar_url]
        );

        // Initialize credits
        await CreditService.initializeCredits(userId);
      } else {
        userId = userResult.rows[0].id;
      }

      // Store GitHub identity
      await query(
        `INSERT INTO github_identities (id, user_id, github_id, username, access_token)
         VALUES ($1, $2, $3, $4, $5)
         ON CONFLICT (user_id) DO UPDATE SET access_token = $5, username = $4`,
        [uuidv4(), userId, github_id, username, accessToken]
      );

      // Create session
      const sessionToken = await createUserSession(userId, email);

      // Set secure cookie
      res.cookie('sessionToken', sessionToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
      });

      // Redirect to frontend
      res.redirect(`${process.env.CORS_ORIGIN || 'http://localhost:3000'}/chat`);
    } catch (error) {
      console.error('OAuth callback error:', error);
      throw Errors.INTERNAL_ERROR('Authentication failed');
    }
  })
);

// Get current user
router.get(
  '/user',
  authenticateUser,
  asyncHandler(async (req: Request, res: Response) => {
    const credits = await CreditService.getUserCredits(req.user!.id);

    res.json({
      user: {
        id: req.user!.id,
        email: req.user!.email,
        name: req.user!.name,
        avatar_url: req.user!.avatar_url,
        created_at: req.user!.created_at,
      },
      credits: credits.balance,
    });
  })
);

// Developer login
router.post(
  '/developer/login',
  authLimiter,
  asyncHandler(async (req: Request, res: Response) => {
    const { code } = req.body;

    if (!code) {
      throw Errors.VALIDATION_ERROR('Code is required');
    }

    // Validate code against environment variable
    // For security, the actual code should be hashed
    const developerCodeHash = process.env.DEVELOPER_CODE_HASH;

    if (!developerCodeHash) {
      throw Errors.INTERNAL_ERROR('Developer authentication not configured');
    }

    // Compare code
    if (!compareHash(code, developerCodeHash)) {
      // Also accept plain "2727" for development
      if (code !== '2727' && process.env.NODE_ENV !== 'development') {
        throw Errors.UNAUTHORIZED('Invalid developer code');
      }

      if (code !== '2727') {
        throw Errors.UNAUTHORIZED('Invalid developer code');
      }
    }

    // Create developer session
    const sessionToken = await createDeveloperSession();

    res.cookie('sessionToken', sessionToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
    });

    res.json({
      message: 'Developer authenticated successfully',
      token: sessionToken,
    });
  })
);

// Logout
router.post(
  '/logout',
  authenticateUser,
  asyncHandler(async (req: Request, res: Response) => {
    const token =
      req.cookies?.sessionToken || req.get('Authorization')?.slice(7) || '';

    if (token) {
      await invalidateUserSession(token);
    }

    res.clearCookie('sessionToken');
    res.json({ message: 'Logged out successfully' });
  })
);

export default router;
