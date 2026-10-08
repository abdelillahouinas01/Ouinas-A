// Developer dashboard routes
import { Router, Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { query } from '../utils/database';
import { authenticateDeveloper } from '../middleware/auth';
import { asyncHandler, Errors } from '../middleware/errors';
import { ModelService, ToolService } from '../services/modelService';
import { CreditService } from '../services/creditService';
import { getProvider } from '../ai/omniroute';

const router = Router();

// Apply developer authentication to all routes
router.use(authenticateDeveloper);

// Get dashboard overview
router.get(
  '/overview',
  asyncHandler(async (req: Request, res: Response) => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    // Total users
    const usersResult = await query(`SELECT COUNT(*) FROM users WHERE disabled = FALSE`);
    const totalUsers = parseInt(usersResult.rows[0].count);

    // Active users today
    const activeResult = await query(
      `SELECT COUNT(DISTINCT user_id) FROM usage_logs WHERE timestamp >= $1`,
      [today]
    );
    const activeUsers = parseInt(activeResult.rows[0].count);

    // Total requests
    const requestsResult = await query(`SELECT COUNT(*) FROM usage_logs`);
    const totalRequests = parseInt(requestsResult.rows[0].count);

    // Requests today
    const todayRequestsResult = await query(
      `SELECT COUNT(*) FROM usage_logs WHERE timestamp >= $1`,
      [today]
    );
    const requestsToday = parseInt(todayRequestsResult.rows[0].count);

    // Credits consumed today
    const creditsResult = await query(
      `SELECT SUM(credits_consumed) FROM usage_logs WHERE timestamp >= $1`,
      [today]
    );
    const creditsConsumedToday = parseFloat(creditsResult.rows[0].sum || '0');

    // Active models
    const modelsResult = await query(`SELECT COUNT(*) FROM models WHERE enabled = TRUE`);
    const activeModels = parseInt(modelsResult.rows[0].count);

    // Active tools
    const toolsResult = await query(`SELECT COUNT(*) FROM tools WHERE enabled = TRUE`);
    const activeTools = parseInt(toolsResult.rows[0].count);

    res.json({
      total_users: totalUsers,
      active_users: activeUsers,
      total_requests: totalRequests,
      requests_today: requestsToday,
      credits_consumed_today: creditsConsumedToday,
      active_models: activeModels,
      active_tools: activeTools,
    });
  })
);

// Get all users
router.get(
  '/users',
  asyncHandler(async (req: Request, res: Response) => {
    const search = (req.query.search as string) || '';
    const limit = Math.min(parseInt(req.query.limit as string) || 50, 100);
    const offset = parseInt(req.query.offset as string) || 0;

    let whereClause = 'WHERE disabled = FALSE';
    const params: any[] = [];

    if (search) {
      whereClause += ` AND (email ILIKE $1 OR name ILIKE $1)`;
      params.push(`%${search}%`);
    }

    // Count query
    const countResult = await query(
      `SELECT COUNT(*) FROM users ${whereClause}`,
      params
    );

    // Data query
    const result = await query(
      `SELECT u.id, u.email, u.name, u.avatar_url, u.created_at, c.balance as credits
       FROM users u
       LEFT JOIN credits c ON u.id = c.user_id
       ${whereClause}
       ORDER BY u.created_at DESC
       LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
      [...params, limit, offset]
    );

    res.json({
      users: result.rows,
      total: parseInt(countResult.rows[0].count),
      limit,
      offset,
    });
  })
);

// Adjust user credits
router.put(
  '/users/:id/credits',
  asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const { amount, reason } = req.body;

    if (!amount || !reason) {
      throw Errors.VALIDATION_ERROR('Amount and reason are required');
    }

    // Verify user exists
    const userResult = await query(`SELECT * FROM users WHERE id = $1`, [id]);
    if (userResult.rows.length === 0) {
      throw Errors.NOT_FOUND('User not found');
    }

    const transaction = await CreditService.grantCredits(id, amount, reason);

    res.json({
      transaction,
      new_balance: (await CreditService.getUserCredits(id)).balance,
    });
  })
);

// Get all models
router.get(
  '/models',
  asyncHandler(async (req: Request, res: Response) => {
    const models = await ModelService.getAllModels(true);
    res.json({ models });
  })
);

// Create model
router.post(
  '/models',
  asyncHandler(async (req: Request, res: Response) => {
    const model = await ModelService.createModel(req.body);
    res.status(201).json({ model });
  })
);

// Update model
router.put(
  '/models/:id',
  asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const model = await ModelService.updateModel(id, req.body);
    res.json({ model });
  })
);

// Delete model
router.delete(
  '/models/:id',
  asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    await ModelService.deleteModel(id);
    res.json({ message: 'Model deleted' });
  })
);

// Reorder model
router.patch(
  '/models/:id/order',
  asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const { priority } = req.body;

    if (priority === undefined) {
      throw Errors.VALIDATION_ERROR('Priority is required');
    }

    const model = await ModelService.reorderModels(id, priority);
    res.json({ model });
  })
);

// Test model
router.post(
  '/models/:id/test',
  asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const success = await ModelService.testModel(id);

    res.json({
      success,
      message: success ? 'Model connection successful' : 'Model test failed',
    });
  })
);

// Get all tools
router.get(
  '/tools',
  asyncHandler(async (req: Request, res: Response) => {
    const tools = await ToolService.getAllTools(true);
    res.json({ tools });
  })
);

// Create tool
router.post(
  '/tools',
  asyncHandler(async (req: Request, res: Response) => {
    const tool = await ToolService.createTool(req.body);
    res.status(201).json({ tool });
  })
);

// Update tool
router.put(
  '/tools/:id',
  asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const tool = await ToolService.updateTool(id, req.body);
    res.json({ tool });
  })
);

// Delete tool
router.delete(
  '/tools/:id',
  asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    await ToolService.deleteTool(id);
    res.json({ message: 'Tool deleted' });
  })
);

// Reorder tool
router.patch(
  '/tools/:id/order',
  asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const { priority } = req.body;

    if (priority === undefined) {
      throw Errors.VALIDATION_ERROR('Priority is required');
    }

    const tool = await ToolService.reorderTools(id, priority);
    res.json({ tool });
  })
);

// Test OmniRoute connection
router.post(
  '/omniroute/test',
  asyncHandler(async (req: Request, res: Response) => {
    const provider = getProvider();
    const connected = await provider.testConnection();

    if (!connected) {
      throw Errors.SERVICE_UNAVAILABLE(
        'Cannot connect to OmniRoute. Check your configuration and ensure it is running.'
      );
    }

    const models = await provider.getAvailableModels();

    res.json({
      connected: true,
      models_available: models.length,
      models: models.slice(0, 10), // Return first 10
    });
  })
);

// Get analytics
router.get(
  '/analytics',
  asyncHandler(async (req: Request, res: Response) => {
    const days = parseInt(req.query.days as string) || 30;

    // Daily requests
    const dailyResult = await query(
      `SELECT DATE(timestamp) as date, COUNT(*) as requests, SUM(credits_consumed) as credits
       FROM usage_logs
       WHERE timestamp > NOW() - INTERVAL '${days} days'
       GROUP BY DATE(timestamp)
       ORDER BY DATE(timestamp)`
    );

    // Top models
    const topModelsResult = await query(
      `SELECT m.name, COUNT(*) as requests, SUM(u.credits_consumed) as credits
       FROM usage_logs u
       JOIN models m ON u.model_id = m.id
       WHERE u.timestamp > NOW() - INTERVAL '${days} days'
       GROUP BY m.id, m.name
       ORDER BY requests DESC
       LIMIT 10`
    );

    res.json({
      daily_requests: dailyResult.rows,
      top_models: topModelsResult.rows,
    });
  })
);

// Get audit logs
router.get(
  '/audit-logs',
  asyncHandler(async (req: Request, res: Response) => {
    const limit = Math.min(parseInt(req.query.limit as string) || 50, 100);
    const offset = parseInt(req.query.offset as string) || 0;

    const countResult = await query(`SELECT COUNT(*) FROM audit_logs`);

    const result = await query(
      `SELECT * FROM audit_logs
       ORDER BY created_at DESC
       LIMIT $1 OFFSET $2`,
      [limit, offset]
    );

    res.json({
      logs: result.rows,
      total: parseInt(countResult.rows[0].count),
      limit,
      offset,
    });
  })
);

export default router;
