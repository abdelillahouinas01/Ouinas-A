// Chat routes - message sending and conversation management
import { Router, Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { query } from '../utils/database';
import { authenticateUser } from '../middleware/auth';
import { asyncHandler, Errors } from '../middleware/errors';
import { chatLimiter } from '../middleware/rateLimit';
import { ModelService } from '../services/modelService';
import { CreditService } from '../services/creditService';
import { getProvider } from '../ai/omniroute';

const router = Router();

// Send a message
router.post(
  '/message',
  authenticateUser,
  chatLimiter,
  asyncHandler(async (req: Request, res: Response) => {
    const { conversation_id, content, model_id, tool_id } = req.body;
    const userId = req.user!.id;

    // Validate input
    if (!content || typeof content !== 'string') {
      throw Errors.VALIDATION_ERROR('Message content is required');
    }

    if (!model_id) {
      throw Errors.VALIDATION_ERROR('Model ID is required');
    }

    if (content.length > 10000) {
      throw Errors.VALIDATION_ERROR('Message too long (max 10000 characters)');
    }

    // Get model
    const model = await ModelService.getModelById(model_id);

    if (!model.enabled) {
      throw Errors.CONFLICT('Selected model is not available');
    }

    // Verify user has enough credits
    const creditCost = model.credits_per_request;
    await CreditService.verifyCredits(userId, creditCost);

    // Get or create conversation
    let convId = conversation_id;

    if (!convId) {
      // Create new conversation
      convId = uuidv4();
      await query(
        `INSERT INTO conversations (id, user_id, model_used)
         VALUES ($1, $2, $3)`,
        [convId, userId, model.model_id]
      );
    } else {
      // Verify conversation belongs to user
      const convResult = await query(
        `SELECT * FROM conversations WHERE id = $1 AND user_id = $2`,
        [convId, userId]
      );

      if (convResult.rows.length === 0) {
        throw Errors.FORBIDDEN('Conversation not found');
      }
    }

    // Store user message
    const userMessageId = uuidv4();
    await query(
      `INSERT INTO messages (id, conversation_id, role, content, model_used, tool_used)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [userMessageId, convId, 'user', content, model.model_id, tool_id || null]
    );

    // Set up streaming response
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    try {
      // Get conversation history
      const messagesResult = await query(
        `SELECT role, content FROM messages
         WHERE conversation_id = $1
         ORDER BY created_at ASC`,
        [convId]
      );

      const messages = messagesResult.rows.map((m: any) => ({
        role: m.role,
        content: m.content,
      }));

      // Prepare request for OmniRoute
      const provider = getProvider();
      let fullResponse = '';
      let tokenCount = 0;

      // Stream response
      try {
        for await (const chunk of provider.streamMessage({
          model: model.model_id,
          messages,
          max_tokens: model.max_output || 2048,
        })) {
          fullResponse += chunk;
          res.write(`data: ${JSON.stringify({ type: 'chunk', content: chunk })}\n\n`);
        }
      } catch (error) {
        // Send error chunk
        const errorMessage =
          error instanceof Error ? error.message : 'Unknown error';
        res.write(
          `data: ${JSON.stringify({
            type: 'error',
            error: errorMessage,
          })}\n\n`
        );

        // Refund credits
        await CreditService.refundCredits(
          userId,
          creditCost,
          'Message generation failed'
        );

        res.end();
        return;
      }

      // Store assistant message
      const assistantMessageId = uuidv4();
      await query(
        `INSERT INTO messages (id, conversation_id, role, content, model_used, tool_used, tokens_used)
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [
          assistantMessageId,
          convId,
          'assistant',
          fullResponse,
          model.model_id,
          tool_id || null,
          tokenCount,
        ]
      );

      // Deduct credits
      await CreditService.deductCredits(
        userId,
        creditCost,
        `Message generation with ${model.name}`
      );

      // Log usage
      await query(
        `INSERT INTO usage_logs (
          id, user_id, model_id, tool_id, timestamp,
          credits_consumed, request_status, response_duration_ms
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
        [
          uuidv4(),
          userId,
          model_id,
          tool_id || null,
          new Date(),
          creditCost,
          'success',
          null,
        ]
      );

      // Send completion
      res.write(
        `data: ${JSON.stringify({
          type: 'complete',
          message_id: assistantMessageId,
          credits_consumed: creditCost,
        })}\n\n`
      );
      res.end();
    } catch (error) {
      console.error('Chat streaming error:', error);
      res.write(
        `data: ${JSON.stringify({
          type: 'error',
          error: 'Stream error',
        })}\n\n`
      );
      res.end();
    }
  })
);

// Get conversations
router.get(
  '/conversations',
  authenticateUser,
  asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user!.id;
    const limit = Math.min(parseInt(req.query.limit as string) || 50, 100);
    const offset = parseInt(req.query.offset as string) || 0;

    const countResult = await query(
      `SELECT COUNT(*) FROM conversations WHERE user_id = $1`,
      [userId]
    );

    const result = await query(
      `SELECT id, title, model_used, created_at, updated_at
       FROM conversations
       WHERE user_id = $1
       ORDER BY updated_at DESC
       LIMIT $2 OFFSET $3`,
      [userId, limit, offset]
    );

    res.json({
      conversations: result.rows,
      total: parseInt(countResult.rows[0].count),
      limit,
      offset,
    });
  })
);

// Get conversation with messages
router.get(
  '/conversations/:id',
  authenticateUser,
  asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const userId = req.user!.id;

    // Verify conversation belongs to user
    const convResult = await query(
      `SELECT * FROM conversations WHERE id = $1 AND user_id = $2`,
      [id, userId]
    );

    if (convResult.rows.length === 0) {
      throw Errors.NOT_FOUND('Conversation not found');
    }

    const conversation = convResult.rows[0];

    // Get messages
    const messagesResult = await query(
      `SELECT * FROM messages WHERE conversation_id = $1 ORDER BY created_at ASC`,
      [id]
    );

    res.json({
      conversation,
      messages: messagesResult.rows,
    });
  })
);

// Delete conversation
router.delete(
  '/conversations/:id',
  authenticateUser,
  asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const userId = req.user!.id;

    // Verify conversation belongs to user
    const convResult = await query(
      `SELECT * FROM conversations WHERE id = $1 AND user_id = $2`,
      [id, userId]
    );

    if (convResult.rows.length === 0) {
      throw Errors.NOT_FOUND('Conversation not found');
    }

    // Delete conversation (cascades to messages)
    await query(`DELETE FROM conversations WHERE id = $1`, [id]);

    res.json({ message: 'Conversation deleted' });
  })
);

// Get models
router.get(
  '/models',
  authenticateUser,
  asyncHandler(async (req: Request, res: Response) => {
    const models = await ModelService.getEnabledModels();
    res.json({ models });
  })
);

// Get tools
router.get(
  '/tools',
  authenticateUser,
  asyncHandler(async (req: Request, res: Response) => {
    const { ToolService } = await import('../services/modelService');
    const tools = await ToolService.getEnabledTools();
    res.json({ tools });
  })
);

export default router;
