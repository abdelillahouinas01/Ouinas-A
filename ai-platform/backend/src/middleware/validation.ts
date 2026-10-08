// Input validation middleware
import { Request, Response, NextFunction } from 'express';
import { body, validationResult } from 'express-validator';
import { Errors } from './errors';

// Validate request and return errors
export function validateRequest(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  const errors = validationResult(req);

  if (!errors.isEmpty()) {
    const details = errors.array().reduce((acc, err) => {
      acc[err.param || 'unknown'] = err.msg;
      return acc;
    }, {} as Record<string, string>);

    throw Errors.VALIDATION_ERROR('Request validation failed', details);
  }

  next();
}

// Common validators
export const validators = {
  // Chat message validators
  messageContent: body('content')
    .notEmpty()
    .withMessage('Content is required')
    .isLength({ min: 1, max: 10000 })
    .withMessage('Content must be between 1 and 10000 characters'),

  modelId: body('model_id')
    .notEmpty()
    .withMessage('Model ID is required')
    .isUUID()
    .withMessage('Model ID must be a valid UUID'),

  toolId: body('tool_id')
    .optional()
    .isUUID()
    .withMessage('Tool ID must be a valid UUID'),

  // Model validators
  modelName: body('name')
    .notEmpty()
    .withMessage('Model name is required')
    .isLength({ min: 1, max: 255 })
    .withMessage('Model name must be between 1 and 255 characters'),

  modelDescription: body('description')
    .optional()
    .isLength({ max: 5000 })
    .withMessage('Description must be less than 5000 characters'),

  modelCreditsPerRequest: body('credits_per_request')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Credits per request must be a positive number'),

  // Developer code validator
  developerCode: body('code')
    .notEmpty()
    .withMessage('Code is required')
    .isLength({ min: 4, max: 100 })
    .withMessage('Code must be between 4 and 100 characters'),

  // Credit adjustment
  creditAmount: body('amount')
    .isFloat()
    .withMessage('Amount must be a number'),

  creditReason: body('reason')
    .notEmpty()
    .withMessage('Reason is required')
    .isLength({ min: 1, max: 255 })
    .withMessage('Reason must be between 1 and 255 characters'),

  // Search/filter
  searchQuery: body('search')
    .optional()
    .isLength({ max: 100 })
    .withMessage('Search query must be less than 100 characters'),

  limit: body('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Limit must be between 1 and 100'),

  offset: body('offset')
    .optional()
    .isInt({ min: 0 })
    .withMessage('Offset must be non-negative'),
};
