// AI Integration Services Export
export { AnthropicService, anthropicService } from './AnthropicService';
export { WeightingService, weightingService } from './WeightingService';
export { ChatService, chatService } from './ChatService';
export { AIAssignmentService, aiAssignmentService } from './AIAssignmentService';
export { ConflictResolutionService, conflictResolutionService } from './ConflictResolutionService';
export { ChatAssignmentWorkflow, chatAssignmentWorkflow } from './ChatAssignmentWorkflow';

// Re-export the modification interface
export type { AssignmentModification } from './ChatAssignmentWorkflow';