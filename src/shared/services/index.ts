// AI Integration Services Export
export { AnthropicService, anthropicService } from './AnthropicService';
export { WeightingService, weightingService } from './WeightingService';
export { ChatService, chatService } from './ChatService';
export { AIAssignmentService, aiAssignmentService } from './AIAssignmentService';
export { ConflictResolutionService, conflictResolutionService } from './ConflictResolutionService';
export { ChatAssignmentWorkflow, chatAssignmentWorkflow } from './ChatAssignmentWorkflow';

// Advanced AI Services (AI-008 to AI-010)
export { ModelSelectionService, modelSelectionService } from './ModelSelectionService';
export { SystemPromptService, systemPromptService } from './SystemPromptService';
export { AICacheService, aiCacheService } from './AICacheService';

// Re-export types and interfaces
export type { AssignmentModification } from './ChatAssignmentWorkflow';
export type { ModelInfo, ModelUseCase, ModelComparison, ModelSelectionContext } from './ModelSelectionService';
export type { PromptType, PromptTemplate, CustomPromptTemplate, PromptValidationResult } from './SystemPromptService';
export type { CacheRequest, CacheStats, CacheConfiguration } from './AICacheService';