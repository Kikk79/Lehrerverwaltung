import {
  Assignment,
  Teacher,
  Course,
  ChatSuggestion,
  AssignmentContext,
  WeightingSettings,
  ChatMessage,
  AIOptimizationResponse
} from '../types';
import { chatService } from './ChatService';
import { aiAssignmentService } from './AIAssignmentService';
import { weightingService } from './WeightingService';
import { conflictResolutionService } from './ConflictResolutionService';

/**
 * Workflow service for chat-based assignment modifications
 * Enables users to modify assignments through natural language conversation
 */
export class ChatAssignmentWorkflow {
  
  /**
   * Start an assignment modification conversation
   */
  public async startAssignmentModification(
    context: AssignmentContext,
    initialRequest?: string
  ): Promise<{
    conversationId: string;
    initialResponse: ChatMessage;
    suggestions: ChatSuggestion[];
  }> {
    // Start conversation with current assignment context
    const conversationId = await chatService.startConversation(
      context,
      `Assignment Modification - ${new Date().toLocaleDateString()}`
    );

    const welcomeMessage = initialRequest || 
      'I would like to modify some teacher assignments. Can you help me analyze the current situation?';

    // Send initial message and get AI analysis
    const initialResponse = await chatService.sendMessage(conversationId, welcomeMessage);
    const suggestions = chatService.getLatestSuggestions(conversationId);

    return {
      conversationId,
      initialResponse,
      suggestions
    };
  }

  /**
   * Process a user modification request
   */
  public async processModificationRequest(
    conversationId: string,
    userRequest: string,
    context: AssignmentContext
  ): Promise<{
    response: ChatMessage;
    actionableChanges: AssignmentModification[];
    requiresConfirmation: boolean;
  }> {
    // Update conversation context with latest data
    chatService.updateConversationContext(conversationId, context);

    // Send user request to AI
    const response = await chatService.sendMessage(conversationId, userRequest);
    
    // Parse response for actionable changes
    const suggestions = chatService.getLatestSuggestions(conversationId);
    const actionableChanges = await this.convertSuggestionsToModifications(suggestions, context);

    // Determine if changes require user confirmation
    const requiresConfirmation = actionableChanges.some(change => 
      change.impact === 'high' || change.type === 'delete_assignment'
    );

    return {
      response,
      actionableChanges,
      requiresConfirmation
    };
  }

  /**
   * Apply approved modifications to assignments
   */
  public async applyModifications(
    modifications: AssignmentModification[],
    context: AssignmentContext
  ): Promise<{
    success: boolean;
    applied: AssignmentModification[];
    failed: AssignmentModification[];
    newContext: AssignmentContext;
    summary: string;
  }> {
    const applied: AssignmentModification[] = [];
    const failed: AssignmentModification[] = [];
    let newAssignments = [...context.current_assignments];

    for (const modification of modifications) {
      try {
        const result = await this.applyModification(modification, newAssignments, context);
        if (result.success) {
          applied.push(modification);
          newAssignments = result.updatedAssignments;
        } else {
          failed.push(modification);
        }
      } catch (error) {
        console.error('Modification failed:', error);
        failed.push(modification);
      }
    }

    // Create updated context
    const newContext: AssignmentContext = {
      ...context,
      current_assignments: newAssignments
    };

    // Generate summary
    const summary = this.generateModificationSummary(applied, failed);

    return {
      success: failed.length === 0,
      applied,
      failed,
      newContext,
      summary
    };
  }

  /**
   * Generate optimization suggestions based on chat conversation
   */
  public async generateChatOptimizationSuggestions(
    conversationId: string,
    context: AssignmentContext
  ): Promise<AIOptimizationResponse> {
    const conversation = chatService.getConversation(conversationId);
    if (!conversation) {
      throw new Error('Conversation not found');
    }

    // Build chat context for AI optimization
    const chatContext = conversation.messages
      .filter(m => m.message_type === 'user')
      .map(m => m.message_content)
      .join(' ');

    const optimizationRequest: any = {
      teachers: context.teachers,
      courses: context.courses,
      existing_assignments: context.current_assignments,
      weighting_settings: context.weighting_settings,
      chat_context: chatContext
    };

    return await aiAssignmentService.optimizeAssignments(optimizationRequest);
  }

  /**
   * Handle emergency override scenarios
   */
  public async handleEmergencyOverride(
    conversationId: string,
    reason: string,
    context: AssignmentContext
  ): Promise<{
    emergency_settings: WeightingSettings;
    new_assignments: Assignment[];
    rationale: string;
  }> {
    // Get emergency weighting settings (loyalty reduced to 0)
    const emergencySettings = weightingService.getEmergencyWeightingSettings();

    // Update conversation with emergency context
    await chatService.sendMessage(
      conversationId, 
      `EMERGENCY OVERRIDE: ${reason}. Please recalculate assignments with emergency weighting settings (loyalty reduced to 0%).`
    );

    // Optimize with emergency settings
    const optimizationRequest: any = {
      teachers: context.teachers,
      courses: context.courses,
      existing_assignments: context.current_assignments,
      weighting_settings: emergencySettings,
      chat_context: `Emergency situation: ${reason}`
    };

    const response = await aiAssignmentService.optimizeAssignments(optimizationRequest);

    return {
      emergency_settings: emergencySettings,
      new_assignments: response.optimized_assignments.map(a => a.assignment),
      rationale: `Emergency override applied: ${reason}. ${response.rationale}`
    };
  }

  /**
   * Convert chat suggestions to concrete assignment modifications
   */
  private async convertSuggestionsToModifications(
    suggestions: ChatSuggestion[],
    context: AssignmentContext
  ): Promise<AssignmentModification[]> {
    const modifications: AssignmentModification[] = [];

    for (const suggestion of suggestions) {
      switch (suggestion.type) {
        case 'reassign':
          modifications.push({
            type: 'reassign_teacher',
            description: suggestion.description,
            assignment_id: suggestion.action_data.assignment_id,
            new_teacher_id: suggestion.action_data.new_teacher_id,
            impact: this.assessModificationImpact(suggestion),
            confidence: suggestion.confidence
          });
          break;

        case 'modify_weights':
          modifications.push({
            type: 'update_weights',
            description: suggestion.description,
            new_weights: suggestion.action_data.weights,
            impact: 'medium',
            confidence: suggestion.confidence
          });
          break;

        case 'resolve_conflict':
          modifications.push({
            type: 'resolve_conflict',
            description: suggestion.description,
            conflict_data: suggestion.action_data,
            impact: 'high',
            confidence: suggestion.confidence
          });
          break;
      }
    }

    return modifications;
  }

  /**
   * Apply a single modification
   */
  private async applyModification(
    modification: AssignmentModification,
    assignments: Assignment[],
    context: AssignmentContext
  ): Promise<{ success: boolean; updatedAssignments: Assignment[] }> {
    switch (modification.type) {
      case 'reassign_teacher':
        return this.applyTeacherReassignment(modification, assignments, context);
      
      case 'update_weights':
        return this.applyWeightUpdate(modification, assignments, context);
      
      case 'resolve_conflict':
        return this.applyConflictResolution(modification, assignments, context);
      
      default:
        return { success: false, updatedAssignments: assignments };
    }
  }

  /**
   * Apply teacher reassignment
   */
  private async applyTeacherReassignment(
    modification: AssignmentModification,
    assignments: Assignment[],
    context: AssignmentContext
  ): Promise<{ success: boolean; updatedAssignments: Assignment[] }> {
    const assignmentIndex = assignments.findIndex(a => a.id === modification.assignment_id);
    if (assignmentIndex === -1) {
      return { success: false, updatedAssignments: assignments };
    }

    const newTeacher = context.teachers.find(t => t.id === modification.new_teacher_id);
    const course = context.courses.find(c => c.id === assignments[assignmentIndex].course_id);

    if (!newTeacher || !course) {
      return { success: false, updatedAssignments: assignments };
    }

    // Verify exact qualification match
    if (!newTeacher.qualifications.includes(course.topic)) {
      return { success: false, updatedAssignments: assignments };
    }

    // Apply reassignment
    const updatedAssignments = [...assignments];
    updatedAssignments[assignmentIndex] = {
      ...assignments[assignmentIndex],
      teacher_id: modification.new_teacher_id!,
      ai_rationale: `Reassigned via chat: ${modification.description}`
    };

    return { success: true, updatedAssignments };
  }

  /**
   * Apply weight update
   */
  private async applyWeightUpdate(
    modification: AssignmentModification,
    assignments: Assignment[],
    context: AssignmentContext
  ): Promise<{ success: boolean; updatedAssignments: Assignment[] }> {
    // Weight updates don't directly modify assignments but would trigger re-optimization
    // This would be handled at a higher level
    return { success: true, updatedAssignments: assignments };
  }

  /**
   * Apply conflict resolution
   */
  private async applyConflictResolution(
    modification: AssignmentModification,
    assignments: Assignment[],
    context: AssignmentContext
  ): Promise<{ success: boolean; updatedAssignments: Assignment[] }> {
    // Conflict resolution would involve specific logic based on conflict type
    // This is a placeholder for the actual implementation
    return { success: true, updatedAssignments: assignments };
  }

  /**
   * Assess the impact level of a modification
   */
  private assessModificationImpact(suggestion: ChatSuggestion): 'low' | 'medium' | 'high' {
    if (suggestion.type === 'add_teacher' || suggestion.confidence < 0.6) {
      return 'high';
    } else if (suggestion.type === 'modify_weights' || suggestion.confidence < 0.8) {
      return 'medium';
    } else {
      return 'low';
    }
  }

  /**
   * Generate summary of applied modifications
   */
  private generateModificationSummary(
    applied: AssignmentModification[],
    failed: AssignmentModification[]
  ): string {
    const summary: string[] = [];

    if (applied.length > 0) {
      summary.push(`Successfully applied ${applied.length} modification(s):`);
      applied.forEach(mod => summary.push(`- ${mod.description}`));
    }

    if (failed.length > 0) {
      summary.push(`Failed to apply ${failed.length} modification(s):`);
      failed.forEach(mod => summary.push(`- ${mod.description}`));
    }

    return summary.join('\n');
  }
}

/**
 * Interface for assignment modification requests
 */
export interface AssignmentModification {
  type: 'reassign_teacher' | 'update_weights' | 'resolve_conflict' | 'delete_assignment';
  description: string;
  assignment_id?: number;
  new_teacher_id?: number;
  new_weights?: WeightingSettings;
  conflict_data?: any;
  impact: 'low' | 'medium' | 'high';
  confidence: number;
}

// Export singleton instance
export const chatAssignmentWorkflow = new ChatAssignmentWorkflow();