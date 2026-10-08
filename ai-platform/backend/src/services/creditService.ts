// Credit Service - handles credit management and deduction
import { query } from '../utils/database';
import { Credits, CreditTransaction } from '../types';
import { Errors } from '../middleware/errors';

export class CreditService {
  // Get user credit balance
  static async getUserCredits(userId: string): Promise<Credits> {
    const result = await query(
      `SELECT * FROM credits WHERE user_id = $1`,
      [userId]
    );

    if (result.rows.length === 0) {
      throw Errors.NOT_FOUND('User credits not found');
    }

    return result.rows[0];
  }

  // Initialize credits for a new user
  static async initializeCredits(userId: string): Promise<Credits> {
    const freeCredits = parseFloat(process.env.FREE_CREDITS_AMOUNT || '10');

    const result = await query(
      `INSERT INTO credits (user_id, balance) VALUES ($1, $2)
       ON CONFLICT (user_id) DO UPDATE SET balance = $2
       RETURNING *`,
      [userId, freeCredits]
    );

    // Log the initial grant
    await query(
      `INSERT INTO credit_transactions (user_id, amount, reason, type)
       VALUES ($1, $2, $3, $4)`,
      [userId, freeCredits, 'Initial grant', 'grant']
    );

    return result.rows[0];
  }

  // Verify user has enough credits
  static async verifyCredits(userId: string, requiredCredits: number): Promise<void> {
    const credits = await this.getUserCredits(userId);

    if (credits.balance < requiredCredits) {
      throw Errors.INSUFFICIENT_CREDITS(
        `Insufficient credits. Required: ${requiredCredits}, Available: ${credits.balance}`
      );
    }
  }

  // Deduct credits from user
  static async deductCredits(
    userId: string,
    amount: number,
    reason: string
  ): Promise<CreditTransaction> {
    // First verify user has enough
    await this.verifyCredits(userId, amount);

    // Start a transaction to ensure atomicity
    const client = await (await import('../utils/database')).getClient();

    try {
      await client.query('BEGIN');

      // Lock the user's credit row
      const creditResult = await client.query(
        `SELECT * FROM credits WHERE user_id = $1 FOR UPDATE`,
        [userId]
      );

      if (creditResult.rows.length === 0) {
        throw Errors.NOT_FOUND('User credits not found');
      }

      const currentBalance = creditResult.rows[0].balance;

      if (currentBalance < amount) {
        throw Errors.INSUFFICIENT_CREDITS(
          `Insufficient credits. Required: ${amount}, Available: ${currentBalance}`
        );
      }

      // Update balance
      await client.query(
        `UPDATE credits SET balance = balance - $1, updated_at = NOW()
         WHERE user_id = $2`,
        [amount, userId]
      );

      // Record transaction
      const transactionResult = await client.query(
        `INSERT INTO credit_transactions (user_id, amount, reason, type)
         VALUES ($1, $2, $3, $4)
         RETURNING *`,
        [userId, amount, reason, 'deduction']
      );

      await client.query('COMMIT');

      return transactionResult.rows[0];
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  // Grant credits to user
  static async grantCredits(
    userId: string,
    amount: number,
    reason: string
  ): Promise<CreditTransaction> {
    const result = await query(
      `UPDATE credits SET balance = balance + $1, updated_at = NOW()
       WHERE user_id = $2
       RETURNING *`,
      [amount, userId]
    );

    if (result.rows.length === 0) {
      throw Errors.NOT_FOUND('User credits not found');
    }

    // Record transaction
    const transactionResult = await query(
      `INSERT INTO credit_transactions (user_id, amount, reason, type)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [userId, amount, reason, 'grant']
    );

    return transactionResult.rows[0];
  }

  // Refund credits (in case of error)
  static async refundCredits(
    userId: string,
    amount: number,
    reason: string
  ): Promise<CreditTransaction> {
    const result = await query(
      `UPDATE credits SET balance = balance + $1, updated_at = NOW()
       WHERE user_id = $2
       RETURNING *`,
      [amount, userId]
    );

    if (result.rows.length === 0) {
      throw Errors.NOT_FOUND('User credits not found');
    }

    // Record transaction
    const transactionResult = await query(
      `INSERT INTO credit_transactions (user_id, amount, reason, type)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [userId, amount, reason, 'refund']
    );

    return transactionResult.rows[0];
  }

  // Get transaction history for a user
  static async getTransactionHistory(
    userId: string,
    limit: number = 50,
    offset: number = 0
  ): Promise<{ transactions: CreditTransaction[]; total: number }> {
    const countResult = await query(
      `SELECT COUNT(*) FROM credit_transactions WHERE user_id = $1`,
      [userId]
    );

    const result = await query(
      `SELECT * FROM credit_transactions
       WHERE user_id = $1
       ORDER BY created_at DESC
       LIMIT $2 OFFSET $3`,
      [userId, limit, offset]
    );

    return {
      transactions: result.rows,
      total: parseInt(countResult.rows[0].count),
    };
  }

  // Get usage summary for a period
  static async getUsageSummary(userId: string, days: number = 30): Promise<any> {
    const result = await query(
      `SELECT
         COUNT(*) as total_requests,
         SUM(credits_consumed) as total_credits_consumed,
         AVG(response_duration_ms) as avg_response_time,
         SUM(CASE WHEN request_status = 'success' THEN 1 ELSE 0 END) as successful_requests,
         SUM(CASE WHEN request_status = 'failed' THEN 1 ELSE 0 END) as failed_requests
       FROM usage_logs
       WHERE user_id = $1 AND timestamp > NOW() - INTERVAL '${days} days'`,
      [userId]
    );

    return result.rows[0];
  }

  // Get daily usage summary
  static async getDailyUsageSummary(
    userId: string,
    days: number = 30
  ): Promise<any[]> {
    const result = await query(
      `SELECT
         DATE(timestamp) as date,
         COUNT(*) as requests,
         SUM(credits_consumed) as credits_consumed
       FROM usage_logs
       WHERE user_id = $1 AND timestamp > NOW() - INTERVAL '${days} days'
       GROUP BY DATE(timestamp)
       ORDER BY DATE(timestamp) DESC`,
      [userId]
    );

    return result.rows;
  }
}
