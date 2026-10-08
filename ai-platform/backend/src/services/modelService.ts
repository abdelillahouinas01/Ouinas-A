// Model Service - handles model management
import { query } from '../utils/database';
import { Model } from '../types';
import { Errors } from '../middleware/errors';
import { v4 as uuidv4 } from 'uuid';

export class ModelService {
  // Get all models (including disabled for developers)
  static async getAllModels(includeDisabled: boolean = false): Promise<Model[]> {
    const whereClause = includeDisabled ? '' : 'WHERE enabled = TRUE';

    const result = await query(
      `SELECT * FROM models ${whereClause} ORDER BY sort_priority ASC, created_at DESC`
    );

    return result.rows;
  }

  // Get enabled models only (for users)
  static async getEnabledModels(): Promise<Model[]> {
    return this.getAllModels(false);
  }

  // Get model by ID
  static async getModelById(modelId: string): Promise<Model> {
    const result = await query(
      `SELECT * FROM models WHERE id = $1`,
      [modelId]
    );

    if (result.rows.length === 0) {
      throw Errors.NOT_FOUND('Model not found');
    }

    return result.rows[0];
  }

  // Get model by model_id (the actual model name)
  static async getModelByModelId(modelId: string): Promise<Model> {
    const result = await query(
      `SELECT * FROM models WHERE model_id = $1`,
      [modelId]
    );

    if (result.rows.length === 0) {
      throw Errors.NOT_FOUND(`Model '${modelId}' not found`);
    }

    return result.rows[0];
  }

  // Create model
  static async createModel(data: Partial<Model>): Promise<Model> {
    // Check for duplicate name
    const existing = await query(
      `SELECT id FROM models WHERE name = $1`,
      [data.name]
    );

    if (existing.rows.length > 0) {
      throw Errors.CONFLICT(`Model with name '${data.name}' already exists`);
    }

    const id = uuidv4();
    const result = await query(
      `INSERT INTO models (
        id, name, provider_id, model_id, description, icon, category,
        capabilities, enabled, free_tier, credits_per_request,
        max_input, max_output, context_window, sort_priority, metadata
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
       RETURNING *`,
      [
        id,
        data.name,
        data.provider_id,
        data.model_id,
        data.description || null,
        data.icon || null,
        data.category || null,
        JSON.stringify(data.capabilities || {}),
        data.enabled ?? true,
        data.free_tier ?? false,
        data.credits_per_request ?? 1.0,
        data.max_input || null,
        data.max_output || null,
        data.context_window || null,
        data.sort_priority ?? 0,
        JSON.stringify(data.metadata || {}),
      ]
    );

    // Log audit
    await this.logAuditAction('create', 'model', id, data.name, {});

    return result.rows[0];
  }

  // Update model
  static async updateModel(modelId: string, data: Partial<Model>): Promise<Model> {
    // Get current model for audit
    const current = await this.getModelById(modelId);

    const updates: string[] = [];
    const values: any[] = [];
    let paramCount = 1;

    if (data.name !== undefined) {
      updates.push(`name = $${paramCount++}`);
      values.push(data.name);
    }
    if (data.description !== undefined) {
      updates.push(`description = $${paramCount++}`);
      values.push(data.description);
    }
    if (data.icon !== undefined) {
      updates.push(`icon = $${paramCount++}`);
      values.push(data.icon);
    }
    if (data.category !== undefined) {
      updates.push(`category = $${paramCount++}`);
      values.push(data.category);
    }
    if (data.capabilities !== undefined) {
      updates.push(`capabilities = $${paramCount++}`);
      values.push(JSON.stringify(data.capabilities));
    }
    if (data.enabled !== undefined) {
      updates.push(`enabled = $${paramCount++}`);
      values.push(data.enabled);
    }
    if (data.credits_per_request !== undefined) {
      updates.push(`credits_per_request = $${paramCount++}`);
      values.push(data.credits_per_request);
    }
    if (data.metadata !== undefined) {
      updates.push(`metadata = $${paramCount++}`);
      values.push(JSON.stringify(data.metadata));
    }

    updates.push(`updated_at = NOW()`);

    if (updates.length === 1) {
      // No changes
      return current;
    }

    values.push(modelId);

    const result = await query(
      `UPDATE models SET ${updates.join(', ')} WHERE id = $${paramCount} RETURNING *`,
      values
    );

    // Log audit
    await this.logAuditAction('update', 'model', modelId, data.name || current.name, {
      before: current,
      after: result.rows[0],
    });

    return result.rows[0];
  }

  // Delete model
  static async deleteModel(modelId: string): Promise<void> {
    const model = await this.getModelById(modelId);

    await query(`DELETE FROM models WHERE id = $1`, [modelId]);

    // Log audit
    await this.logAuditAction('delete', 'model', modelId, model.name, {});
  }

  // Reorder models
  static async reorderModels(modelId: string, newPriority: number): Promise<Model> {
    const result = await query(
      `UPDATE models SET sort_priority = $1, updated_at = NOW() WHERE id = $2 RETURNING *`,
      [newPriority, modelId]
    );

    if (result.rows.length === 0) {
      throw Errors.NOT_FOUND('Model not found');
    }

    return result.rows[0];
  }

  // Test model connection
  static async testModel(modelId: string): Promise<boolean> {
    const model = await this.getModelById(modelId);

    if (!model.enabled) {
      throw Errors.CONFLICT('Model is disabled');
    }

    // For now, just verify the model exists in our database
    // In the future, this could test actual connectivity to the provider
    return true;
  }

  // Audit logging
  private static async logAuditAction(
    actionType: string,
    resourceType: string,
    resourceId: string,
    resourceName: string | null,
    changes: Record<string, any>
  ): Promise<void> {
    await query(
      `INSERT INTO audit_logs (action_type, resource_type, resource_id, resource_name, changes)
       VALUES ($1, $2, $3, $4, $5)`,
      [actionType, resourceType, resourceId, resourceName, JSON.stringify(changes)]
    );
  }
}

// Tool Service
export class ToolService {
  // Get all tools
  static async getAllTools(includeDisabled: boolean = false): Promise<any[]> {
    const whereClause = includeDisabled ? '' : 'WHERE enabled = TRUE';

    const result = await query(
      `SELECT * FROM tools ${whereClause} ORDER BY sort_priority ASC, created_at DESC`
    );

    return result.rows;
  }

  // Get enabled tools only
  static async getEnabledTools(): Promise<any[]> {
    return this.getAllTools(false);
  }

  // Get tool by ID
  static async getToolById(toolId: string): Promise<any> {
    const result = await query(
      `SELECT * FROM tools WHERE id = $1`,
      [toolId]
    );

    if (result.rows.length === 0) {
      throw Errors.NOT_FOUND('Tool not found');
    }

    return result.rows[0];
  }

  // Create tool
  static async createTool(data: any): Promise<any> {
    const existing = await query(
      `SELECT id FROM tools WHERE name = $1`,
      [data.name]
    );

    if (existing.rows.length > 0) {
      throw Errors.CONFLICT(`Tool with name '${data.name}' already exists`);
    }

    const id = uuidv4();
    const result = await query(
      `INSERT INTO tools (
        id, name, description, icon, category, capabilities,
        enabled, compatible_models, metadata, sort_priority
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
       RETURNING *`,
      [
        id,
        data.name,
        data.description || null,
        data.icon || null,
        data.category || null,
        JSON.stringify(data.capabilities || {}),
        data.enabled ?? true,
        JSON.stringify(data.compatible_models || ['*']),
        JSON.stringify(data.metadata || {}),
        data.sort_priority ?? 0,
      ]
    );

    return result.rows[0];
  }

  // Update tool
  static async updateTool(toolId: string, data: any): Promise<any> {
    const current = await this.getToolById(toolId);

    const updates: string[] = [];
    const values: any[] = [];
    let paramCount = 1;

    if (data.name !== undefined) {
      updates.push(`name = $${paramCount++}`);
      values.push(data.name);
    }
    if (data.description !== undefined) {
      updates.push(`description = $${paramCount++}`);
      values.push(data.description);
    }
    if (data.enabled !== undefined) {
      updates.push(`enabled = $${paramCount++}`);
      values.push(data.enabled);
    }
    if (data.compatible_models !== undefined) {
      updates.push(`compatible_models = $${paramCount++}`);
      values.push(JSON.stringify(data.compatible_models));
    }

    updates.push(`updated_at = NOW()`);

    if (updates.length === 1) {
      return current;
    }

    values.push(toolId);

    const result = await query(
      `UPDATE tools SET ${updates.join(', ')} WHERE id = $${paramCount} RETURNING *`,
      values
    );

    return result.rows[0];
  }

  // Delete tool
  static async deleteTool(toolId: string): Promise<void> {
    await query(`DELETE FROM tools WHERE id = $1`, [toolId]);
  }

  // Reorder tools
  static async reorderTools(toolId: string, newPriority: number): Promise<any> {
    const result = await query(
      `UPDATE tools SET sort_priority = $1, updated_at = NOW() WHERE id = $2 RETURNING *`,
      [newPriority, toolId]
    );

    if (result.rows.length === 0) {
      throw Errors.NOT_FOUND('Tool not found');
    }

    return result.rows[0];
  }
}
