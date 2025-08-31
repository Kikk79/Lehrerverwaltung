import { AnthropicModel, AnthropicConfig } from '../types';

// Avoid bundling better-sqlite3 into the renderer; only load DatabaseService in non-renderer contexts
const isRenderer = typeof process !== 'undefined' && (process as any)?.type === 'renderer';
let FallbackDatabaseService: any = null;
if (!isRenderer) {
  try {
    // eslint-disable-next-line no-eval
    const nodeRequire = eval('require');
    FallbackDatabaseService = nodeRequire('./DatabaseService').DatabaseService;
  } catch {
    FallbackDatabaseService = null;
  }
}

/**
 * Service for managing AI model selection and configuration
 * Handles model availability, pricing, and capability information
 */
export class ModelSelectionService {
  
  /**
   * Available Anthropic models with their capabilities and characteristics
   */
  private readonly availableModels: ModelInfo[] = [
    {
      id: 'claude-haiku-3.5-20241022',
      name: 'Claude 3.5 Haiku',
      description: 'Fast and efficient for simple tasks',
      tier: 'haiku',
      maxTokens: 200000,
      speed: 'fastest',
      cost: 'lowest',
      capabilities: {
        assignment_optimization: 'good',
        chat_interaction: 'excellent', 
        csv_interpretation: 'excellent',
        rationale_generation: 'good'
      },
      recommended_for: ['Quick chat responses', 'CSV analysis', 'Simple optimizations'],
      limitations: ['Less sophisticated reasoning', 'Shorter response quality']
    },
    {
      id: 'claude-sonnet-4-20250514',
      name: 'Claude 4 Sonnet',
      description: 'Balanced performance and capability',
      tier: 'sonnet',
      maxTokens: 200000,
      speed: 'fast',
      cost: 'medium',
      capabilities: {
        assignment_optimization: 'excellent',
        chat_interaction: 'excellent',
        csv_interpretation: 'excellent', 
        rationale_generation: 'excellent'
      },
      recommended_for: ['Complex assignment optimization', 'Detailed chat interactions', 'Advanced reasoning'],
      limitations: ['Higher cost than Haiku', 'Slightly slower than Haiku']
    },
    {
      id: 'claude-opus-4-20241022',
      name: 'Claude 4 Opus',
      description: 'Most capable model for complex reasoning',
      tier: 'opus',
      maxTokens: 200000,
      speed: 'moderate',
      cost: 'highest',
      capabilities: {
        assignment_optimization: 'exceptional',
        chat_interaction: 'exceptional',
        csv_interpretation: 'excellent',
        rationale_generation: 'exceptional'
      },
      recommended_for: ['Most complex optimization problems', 'Deep reasoning tasks', 'Critical assignments'],
      limitations: ['Highest cost', 'Slower responses', 'May be overkill for simple tasks']
    }
  ];

  /**
   * Get all available models
   */
  public getAvailableModels(): ModelInfo[] {
    return [...this.availableModels];
  }

  /**
   * Get model information by ID
   */
  public getModelInfo(modelId: AnthropicModel): ModelInfo | null {
    return this.availableModels.find(model => model.id === modelId) || null;
  }

  /**
   * Get recommended model for specific use case
   */
  public getRecommendedModel(useCase: ModelUseCase): ModelInfo {
    switch (useCase) {
      case 'quick_chat':
        return this.availableModels.find(m => m.id === 'claude-haiku-3.5-20241022')!;
      
      case 'assignment_optimization':
        return this.availableModels.find(m => m.id === 'claude-sonnet-4-20250514')!;
      
      case 'complex_reasoning':
        return this.availableModels.find(m => m.id === 'claude-opus-4-20241022')!;
      
      case 'csv_analysis':
        return this.availableModels.find(m => m.id === 'claude-haiku-3.5-20241022')!;
      
      case 'balanced_performance':
      default:
        return this.availableModels.find(m => m.id === 'claude-sonnet-4-20250514')!;
    }
  }

  /**
   * Get current model configuration from database
   */
  public async getCurrentModelConfig(): Promise<AnthropicModel> {
    try {
      const db = (typeof window !== 'undefined' && (window as any)?.electronAPI?.database)
        ? (window as any).electronAPI.database
        : (FallbackDatabaseService ? FallbackDatabaseService.getInstance() : null);
      const modelSetting = await db?.getSetting('ai_model');
      const modelId = modelSetting as AnthropicModel;
      
      // Validate model exists
      if (modelId && this.availableModels.some(m => m.id === modelId)) {
        return modelId;
      }
      
      // Return default if invalid
      return 'claude-sonnet-4-20250514';
    } catch (error) {
      console.error('Failed to get current model config:', error);
      return 'claude-sonnet-4-20250514';
    }
  }

  /**
   * Update model selection in database
   */
  public async updateModelSelection(modelId: AnthropicModel): Promise<boolean> {
    try {
      // Validate model exists
      if (!this.availableModels.some(m => m.id === modelId)) {
        throw new Error(`Invalid model ID: ${modelId}`);
      }

      const db = (typeof window !== 'undefined' && (window as any)?.electronAPI?.database)
        ? (window as any).electronAPI.database
        : (FallbackDatabaseService ? FallbackDatabaseService.getInstance() : null);
      await db?.setSetting('ai_model', modelId);
      return true;
    } catch (error) {
      console.error('Failed to update model selection:', error);
      return false;
    }
  }

  /**
   * Get model comparison for decision making
   */
  public compareModels(modelIds: AnthropicModel[]): ModelComparison {
    const models = modelIds
      .map(id => this.getModelInfo(id))
      .filter(Boolean) as ModelInfo[];

    if (models.length === 0) {
      throw new Error('No valid models provided for comparison');
    }

    return {
      models,
      comparison: {
        fastest: models.reduce((prev, current) => 
          this.getSpeedScore(prev.speed) > this.getSpeedScore(current.speed) ? prev : current
        ),
        most_capable: models.reduce((prev, current) => 
          this.getCapabilityScore(prev) > this.getCapabilityScore(current) ? prev : current
        ),
        most_cost_effective: models.reduce((prev, current) => 
          this.getCostScore(prev.cost) > this.getCostScore(current.cost) ? prev : current
        )
      },
      recommendation: this.getRecommendationFromComparison(models)
    };
  }

  /**
   * Auto-select best model based on context
   */
  public autoSelectModel(context: ModelSelectionContext): ModelInfo {
    if (context.priority === 'speed' && context.complexity === 'low') {
      return this.getRecommendedModel('quick_chat');
    }
    
    if (context.priority === 'cost' && context.complexity !== 'high') {
      return this.getRecommendedModel('quick_chat');
    }

    if (context.complexity === 'high' || context.priority === 'accuracy') {
      return this.getRecommendedModel('complex_reasoning');
    }

    return this.getRecommendedModel('balanced_performance');
  }

  /**
   * Get usage statistics for model selection
   */
  public async getModelUsageStats(): Promise<ModelUsageStats> {
    // This would typically come from usage tracking
    // For now, return mock data based on model characteristics
    return {
      total_requests: 0,
      model_breakdown: this.availableModels.map(model => ({
        model_id: model.id,
        request_count: 0,
        success_rate: 0.95,
        avg_response_time: this.getEstimatedResponseTime(model),
        total_tokens_used: 0
      })),
      cost_analysis: {
        total_cost_estimate: 0,
        cost_by_model: this.availableModels.map(model => ({
          model_id: model.id,
          estimated_cost: 0
        }))
      },
      recommendations: this.generateUsageRecommendations()
    };
  }

  /**
   * Validate model availability and API compatibility
   */
  public async validateModelAvailability(modelId: AnthropicModel): Promise<ModelValidationResult> {
    try {
      const modelInfo = this.getModelInfo(modelId);
      if (!modelInfo) {
        return {
          isValid: false,
          error: 'Model not found in available models list'
        };
      }

      // Test if API key is available
      const db = (typeof window !== 'undefined' && (window as any)?.electronAPI?.database)
        ? (window as any).electronAPI.database
        : (FallbackDatabaseService ? FallbackDatabaseService.getInstance() : null);
      const apiKey = await db?.getSetting('ai_api_key');
      if (!apiKey) {
        return {
          isValid: false,
          error: 'API key not configured'
        };
      }

      return {
        isValid: true,
        modelInfo
      };
    } catch (error) {
      return {
        isValid: false,
        error: `Validation failed: ${error}`
      };
    }
  }

  /**
   * Helper: Get speed score for comparison
   */
  private getSpeedScore(speed: string): number {
    switch (speed) {
      case 'fastest': return 3;
      case 'fast': return 2;
      case 'moderate': return 1;
      default: return 0;
    }
  }

  /**
   * Helper: Get capability score for comparison
   */
  private getCapabilityScore(model: ModelInfo): number {
    const capabilities = model.capabilities;
    const scores = {
      'good': 1,
      'excellent': 2,
      'exceptional': 3
    };

    return Object.values(capabilities).reduce((total, capability) => 
      total + (scores[capability as keyof typeof scores] || 0), 0
    );
  }

  /**
   * Helper: Get cost score (higher is better/cheaper)
   */
  private getCostScore(cost: string): number {
    switch (cost) {
      case 'lowest': return 3;
      case 'medium': return 2;
      case 'highest': return 1;
      default: return 0;
    }
  }

  /**
   * Helper: Get recommendation from model comparison
   */
  private getRecommendationFromComparison(models: ModelInfo[]): string {
    if (models.length === 1) {
      return `${models[0].name} is your only option.`;
    }

    const haiku = models.find(m => m.tier === 'haiku');
    const sonnet = models.find(m => m.tier === 'sonnet');
    const opus = models.find(m => m.tier === 'opus');

    if (haiku && sonnet && opus) {
      return 'For most assignment tasks, Sonnet provides the best balance of speed and capability. Use Haiku for quick operations and Opus for complex reasoning.';
    }

    if (sonnet) {
      return 'Sonnet offers excellent performance for most assignment optimization tasks.';
    }

    return 'Choose based on your specific needs: speed vs capability vs cost.';
  }

  /**
   * Helper: Get estimated response time
   */
  private getEstimatedResponseTime(model: ModelInfo): number {
    switch (model.tier) {
      case 'haiku': return 1.2;
      case 'sonnet': return 2.1; 
      case 'opus': return 4.5;
      default: return 2.0;
    }
  }

  /**
   * Helper: Generate usage recommendations
   */
  private generateUsageRecommendations(): string[] {
    return [
      'Use Claude 3.5 Haiku for quick chat interactions and CSV analysis',
      'Use Claude 4 Sonnet for most assignment optimization tasks', 
      'Use Claude 4 Opus only for the most complex reasoning requirements',
      'Monitor your usage to optimize costs while maintaining quality'
    ];
  }
}

// Types for model selection
export interface ModelInfo {
  id: AnthropicModel;
  name: string;
  description: string;
  tier: 'haiku' | 'sonnet' | 'opus';
  maxTokens: number;
  speed: 'fastest' | 'fast' | 'moderate' | 'slow';
  cost: 'lowest' | 'medium' | 'highest';
  capabilities: {
    assignment_optimization: 'good' | 'excellent' | 'exceptional';
    chat_interaction: 'good' | 'excellent' | 'exceptional';
    csv_interpretation: 'good' | 'excellent' | 'exceptional';
    rationale_generation: 'good' | 'excellent' | 'exceptional';
  };
  recommended_for: string[];
  limitations: string[];
}

export type ModelUseCase = 
  | 'quick_chat' 
  | 'assignment_optimization' 
  | 'complex_reasoning' 
  | 'csv_analysis' 
  | 'balanced_performance';

export interface ModelComparison {
  models: ModelInfo[];
  comparison: {
    fastest: ModelInfo;
    most_capable: ModelInfo;
    most_cost_effective: ModelInfo;
  };
  recommendation: string;
}

export interface ModelSelectionContext {
  priority: 'speed' | 'accuracy' | 'cost';
  complexity: 'low' | 'medium' | 'high';
  use_case?: ModelUseCase;
}

export interface ModelUsageStats {
  total_requests: number;
  model_breakdown: {
    model_id: AnthropicModel;
    request_count: number;
    success_rate: number;
    avg_response_time: number;
    total_tokens_used: number;
  }[];
  cost_analysis: {
    total_cost_estimate: number;
    cost_by_model: {
      model_id: AnthropicModel;
      estimated_cost: number;
    }[];
  };
  recommendations: string[];
}

export interface ModelValidationResult {
  isValid: boolean;
  error?: string;
  modelInfo?: ModelInfo;
}

// Export singleton instance
export const modelSelectionService = new ModelSelectionService();