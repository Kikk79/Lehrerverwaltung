import { 
  ChatMessage, 
  ChatConversation, 
  AssignmentContext,
  ChatSuggestion,
  AIResponse,
  Teacher,
  Course,
  Assignment,
  Conflict,
  WeightingSettings
} from '../types';
import { anthropicService } from './AnthropicService';

/**
 * Service for managing AI-powered chat conversations about assignments
 * Provides context-aware communication and assignment modification suggestions
 */
export class ChatService {
  private conversations: Map<string, ChatConversation> = new Map();
  private currentConversationId: string | null = null;

  /**
   * Start a new conversation with assignment context
   */
  public async startConversation(
    context: AssignmentContext,
    title?: string
  ): Promise<string> {
    const conversationId = this.generateConversationId();
    const now = new Date().toISOString();

    const conversation: ChatConversation = {
      id: conversationId,
      title: title || `Assignment Discussion - ${new Date().toLocaleDateString()}`,
      messages: [],
      context,
      created_at: now,
      updated_at: now
    };

    // Add system message with context
    const systemMessage: ChatMessage = {
      conversation_id: conversationId,
      message_type: 'system',
      message_content: this.buildContextSystemMessage(context),
      context_data: JSON.stringify(context),
      timestamp: now
    };

    conversation.messages.push(systemMessage);
    this.conversations.set(conversationId, conversation);
    this.currentConversationId = conversationId;

    return conversationId;
  }

  /**
   * Send a message in a conversation
   */
  public async sendMessage(
    conversationId: string,
    userMessage: string
  ): Promise<ChatMessage> {
    const conversation = this.conversations.get(conversationId);
    if (!conversation) {
      throw new Error(`Conversation ${conversationId} not found`);
    }

    // Add user message
    const userMsg: ChatMessage = {
      conversation_id: conversationId,
      message_type: 'user',
      message_content: userMessage,
      timestamp: new Date().toISOString()
    };
    conversation.messages.push(userMsg);

    // Build chat history for AI
    const chatHistory = this.buildChatHistoryPrompt(conversation);
    const systemPrompt = this.buildChatSystemPrompt(conversation.context);

    try {
      // Get AI response
      const aiResponse = await anthropicService.sendMessage(
        chatHistory + '\n\nUser: ' + userMessage,
        systemPrompt
      );

      // Parse AI response for suggestions
      const { cleanResponse, suggestions } = this.parseAIResponseForSuggestions(aiResponse.content);

      // Add assistant message
      const assistantMsg: ChatMessage = {
        conversation_id: conversationId,
        message_type: 'assistant',
        message_content: cleanResponse,
        context_data: suggestions.length > 0 ? JSON.stringify(suggestions) : undefined,
        timestamp: new Date().toISOString()
      };

      conversation.messages.push(assistantMsg);
      conversation.updated_at = new Date().toISOString();

      return assistantMsg;
    } catch (error) {
      const errorMsg: ChatMessage = {
        conversation_id: conversationId,
        message_type: 'assistant',
        message_content: `I apologize, but I encountered an error: ${error}. Please try again.`,
        timestamp: new Date().toISOString()
      };

      conversation.messages.push(errorMsg);
      return errorMsg;
    }
  }

  /**
   * Update conversation context with new assignment data
   */
  public updateConversationContext(
    conversationId: string,
    newContext: Partial<AssignmentContext>
  ): boolean {
    const conversation = this.conversations.get(conversationId);
    if (!conversation) {
      return false;
    }

    conversation.context = { ...conversation.context, ...newContext };
    conversation.updated_at = new Date().toISOString();

    // Add context update message
    const contextMsg: ChatMessage = {
      conversation_id: conversationId,
      message_type: 'system',
      message_content: 'Context updated with latest assignment data.',
      context_data: JSON.stringify(newContext),
      timestamp: new Date().toISOString()
    };

    conversation.messages.push(contextMsg);
    return true;
  }

  /**
   * Get conversation by ID
   */
  public getConversation(conversationId: string): ChatConversation | null {
    return this.conversations.get(conversationId) || null;
  }

  /**
   * Get all conversations
   */
  public getAllConversations(): ChatConversation[] {
    return Array.from(this.conversations.values()).sort((a, b) => 
      new Date(b.updated_at || '').getTime() - new Date(a.updated_at || '').getTime()
    );
  }

  /**
   * Delete a conversation
   */
  public deleteConversation(conversationId: string): boolean {
    return this.conversations.delete(conversationId);
  }

  /**
   * Get suggestions from the latest AI response
   */
  public getLatestSuggestions(conversationId: string): ChatSuggestion[] {
    const conversation = this.conversations.get(conversationId);
    if (!conversation) {
      return [];
    }

    // Find the latest assistant message with suggestions
    for (let i = conversation.messages.length - 1; i >= 0; i--) {
      const message = conversation.messages[i];
      if (message.message_type === 'assistant' && message.context_data) {
        try {
          return JSON.parse(message.context_data) as ChatSuggestion[];
        } catch {
          // Ignore parse errors
        }
      }
    }

    return [];
  }

  /**
   * Ask AI for specific assignment help
   */
  public async askForAssignmentHelp(
    conversationId: string,
    helpType: 'conflict_resolution' | 'workload_balance' | 'scheduling_optimization',
    specificData?: any
  ): Promise<ChatMessage> {
    const prompts = {
      conflict_resolution: 'I have scheduling conflicts in my assignments. Can you help me resolve them?',
      workload_balance: 'The workload distribution among teachers seems uneven. How can I balance it better?',
      scheduling_optimization: 'Can you suggest better time slots for these course assignments?'
    };

    let prompt = prompts[helpType];
    if (specificData) {
      prompt += `\n\nSpecific details: ${JSON.stringify(specificData)}`;
    }

    return this.sendMessage(conversationId, prompt);
  }

  /**
   * Generate suggestions for common assignment scenarios
   */
  public async generateQuickSuggestions(
    context: AssignmentContext
  ): Promise<ChatSuggestion[]> {
    const systemPrompt = this.buildSuggestionSystemPrompt();
    const contextPrompt = this.buildContextPrompt(context);

    try {
      const response = await anthropicService.sendMessage(
        `Analyze the current assignment situation and provide 3-5 quick suggestions for improvement:
        
        ${contextPrompt}`,
        systemPrompt
      );

      const suggestions = this.parseAIResponseForSuggestions(response.content);
      return suggestions.suggestions;
    } catch (error) {
      console.error('Failed to generate suggestions:', error);
      return [];
    }
  }

  /**
   * Build system message with context information
   */
  private buildContextSystemMessage(context: AssignmentContext): string {
    return `Starting new assignment discussion.

Context Summary:
- Teachers: ${context.teachers.length} available
- Courses: ${context.courses.length} to assign  
- Current Assignments: ${context.current_assignments.length}
- Conflicts: ${context.conflicts.length}
- Weighting Profile: ${context.weighting_settings.profile_name}

I'm here to help optimize your teacher-course assignments. What would you like to discuss?`;
  }

  /**
   * Build system prompt for chat interactions
   */
  private buildChatSystemPrompt(context: AssignmentContext): string {
    return `You are an intelligent assignment optimization assistant. Help the user with teacher-course assignments.

CURRENT CONTEXT:
${this.buildContextPrompt(context)}

CAPABILITIES:
- Suggest assignment optimizations
- Resolve scheduling conflicts  
- Balance teacher workloads
- Explain assignment decisions
- Provide alternative solutions

RULES:
- Only suggest assignments where teacher qualifications EXACTLY match course topics
- Consider the current weighting settings: Equality ${context.weighting_settings.equality_weight}%, Continuity ${context.weighting_settings.continuity_weight}%, Loyalty ${context.weighting_settings.loyalty_weight}%
- Be conversational and helpful
- If you have specific suggestions, include them in a SUGGESTIONS block at the end

RESPONSE FORMAT:
Provide helpful conversational response, then optionally:

SUGGESTIONS:
[{"type": "action_type", "description": "clear description", "action_data": {relevant_data}, "confidence": 0.9}]`;
  }

  /**
   * Build suggestion-focused system prompt
   */
  private buildSuggestionSystemPrompt(): string {
    return `You are an assignment optimization analyzer. Provide practical suggestions for improving teacher-course assignments.

SUGGESTION TYPES:
- reassign: Move a teacher to a different course
- modify_weights: Adjust weighting settings
- add_teacher: Suggest hiring additional teachers
- resolve_conflict: Fix scheduling conflicts

RESPONSE FORMAT:
Return only a JSON array of suggestions:
[{"type": "suggestion_type", "description": "actionable description", "action_data": {specific_data}, "confidence": 0.8}]`;
  }

  /**
   * Build context prompt from assignment context
   */
  private buildContextPrompt(context: AssignmentContext): string {
    const teacherList = context.teachers.map(t => 
      `${t.name} (Qualifications: ${t.qualifications.join(', ')})`
    ).join('\n');

    const courseList = context.courses.map(c => 
      `${c.topic} (${c.lessons_count} lessons, ${c.lesson_duration}min each)`
    ).join('\n');

    const assignmentList = context.current_assignments.map(a => 
      `Assignment ${a.id}: Teacher ${a.teacher_id} → Course ${a.course_id} (${a.status})`
    ).join('\n');

    return `TEACHERS:
${teacherList}

COURSES:
${courseList}

CURRENT ASSIGNMENTS:
${assignmentList}

CONFLICTS: ${context.conflicts.length} total
${context.conflicts.map(c => `- ${c.type}: ${c.description}`).join('\n')}

WEIGHTING SETTINGS: ${context.weighting_settings.profile_name}
- Equality: ${context.weighting_settings.equality_weight}%
- Continuity: ${context.weighting_settings.continuity_weight}%  
- Loyalty: ${context.weighting_settings.loyalty_weight}%`;
  }

  /**
   * Build chat history prompt
   */
  private buildChatHistoryPrompt(conversation: ChatConversation): string {
    return conversation.messages
      .filter(m => m.message_type !== 'system')
      .map(m => `${m.message_type === 'user' ? 'User' : 'Assistant'}: ${m.message_content}`)
      .join('\n');
  }

  /**
   * Parse AI response for embedded suggestions
   */
  private parseAIResponseForSuggestions(content: string): { cleanResponse: string; suggestions: ChatSuggestion[] } {
    const suggestionMatch = content.match(/SUGGESTIONS:\s*([\s\S]*?)(?:\n\n|$)/);
    
    if (!suggestionMatch) {
      return { cleanResponse: content, suggestions: [] };
    }

    const cleanResponse = content.replace(/SUGGESTIONS:[\s\S]*$/, '').trim();
    
    try {
      const suggestionsText = suggestionMatch[1].trim();
      const suggestions = JSON.parse(suggestionsText);
      return { cleanResponse, suggestions };
    } catch {
      return { cleanResponse: content, suggestions: [] };
    }
  }

  /**
   * Generate unique conversation ID
   */
  private generateConversationId(): string {
    return `chat_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Get current conversation ID
   */
  public getCurrentConversationId(): string | null {
    return this.currentConversationId;
  }

  /**
   * Set current conversation
   */
  public setCurrentConversation(conversationId: string): boolean {
    if (this.conversations.has(conversationId)) {
      this.currentConversationId = conversationId;
      return true;
    }
    return false;
  }
}

// Export singleton instance
export const chatService = new ChatService();