// Rate limiting middleware
import rateLimit from 'express-rate-limit';
import { Errors } from './errors';

// Rate limit by IP
export const ipLimiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000'), // 15 minutes
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100'),
  message: 'Too many requests from this IP, please try again later.',
  standardHeaders: false, // Disable `RateLimit-*` headers
  skip: (req) => {
    // Skip rate limiting for health checks
    return req.path === '/health';
  },
  handler: (req, res) => {
    throw Errors.RATE_LIMIT('Too many requests. Please try again later.');
  },
});

// Stricter rate limit for auth endpoints
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // 5 requests per window
  skipSuccessfulRequests: false,
  message: 'Too many login attempts, please try again later.',
  standardHeaders: false,
  handler: (req, res) => {
    throw Errors.RATE_LIMIT('Too many authentication attempts. Please try again later.');
  },
});

// Rate limit for chat endpoint (per user)
export const chatLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 30, // 30 messages per minute
  keyGenerator: (req) => {
    // Use user ID if authenticated, otherwise use IP
    return req.user?.id || req.ip || 'unknown';
  },
  skipSuccessfulRequests: false,
  message: 'Too many messages, please slow down.',
  standardHeaders: false,
  handler: (req, res) => {
    throw Errors.RATE_LIMIT('Message rate limit exceeded. Please slow down.');
  },
});
