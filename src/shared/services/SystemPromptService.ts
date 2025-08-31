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
 * Service for managing and customizing AI system prompts
 * Provides templates, validation, and storage for system prompts
 */
export class SystemPromptService {

  /**
   * Default system prompt templates for different use cases
   */
  private readonly defaultPrompts: Record<PromptType, PromptTemplate> = {
    assignment_optimization: {
      type: 'assignment_optimization',
      name: 'Assignment Optimization',
      description: 'For optimizing teacher-course assignments with weighting factors',
      template: `You are an intelligent teacher-course assignment optimization system. Your goal is to create optimal assignments based on exact qualification matching and weighted scoring criteria.

CRITICAL REQUIREMENTS:
1. Teachers can only be assigned to courses where their qualifications EXACTLY match the course topic
2. Never suggest assignments where qualifications don't match exactly
3. Consider three weighting factors: Equality (workload distribution), Continuity (consecutive lessons), and Loyalty (teacher-course consistency)

WEIGHTING FACTORS:
- Equality Weight: Distributes workload evenly across teachers (0-100%)
- Continuity Weight: Prefers consecutive lesson blocks over scattered times (0-100%)  
- Loyalty Weight: Maintains teacher-course relationships from previous assignments (0-100%)

SCORING ALGORITHM:
Final Score = (EqualityScore × EqualityWeight) + (ContinuityScore × ContinuityWeight) + (LoyaltyScore × LoyaltyWeight)

RESPONSE FORMAT:
Return valid JSON with the structure matching AIOptimizationResponse interface.
Include detailed rationale explaining the optimization decisions.
Provide alternative solutions when conflicts exist.`,
      variables: ['EQUALITY_WEIGHT', 'CONTINUITY_WEIGHT', 'LOYALTY_WEIGHT'],
      category: 'core',
      is_active: true
    },

    chat_conversation: {
      type: 'chat_conversation',
      name: 'Chat Conversation',
      description: 'For interactive chat conversations about assignments',
      template: `You are an intelligent assignment optimization assistant. Help the user with teacher-course assignments.

CAPABILITIES:
- Suggest assignment optimizations
- Resolve scheduling conflicts  
- Balance teacher workloads
- Explain assignment decisions
- Provide alternative solutions

RULES:
- Only suggest assignments where teacher qualifications EXACTLY match course topics
- Consider the current weighting settings: Equality {{EQUALITY_WEIGHT}}%, Continuity {{CONTINUITY_WEIGHT}}%, Loyalty {{LOYALTY_WEIGHT}}%
- Be conversational and helpful
- If you have specific suggestions, include them in a SUGGESTIONS block at the end

RESPONSE FORMAT:
Provide helpful conversational response, then optionally:

SUGGESTIONS:
[{"type": "action_type", "description": "clear description", "action_data": {relevant_data}, "confidence": 0.9}]`,
      variables: ['EQUALITY_WEIGHT', 'CONTINUITY_WEIGHT', 'LOYALTY_WEIGHT', 'CONTEXT'],
      category: 'interaction',
      is_active: true
    },

    csv_interpretation: {
      type: 'csv_interpretation',
      name: 'CSV Data Interpretation',
      description: 'For analyzing and interpreting CSV import data',
      template: `You are a CSV interpretation system. Analyze CSV headers and data to map columns to database fields.

Available database fields: 
- Teachers: name, qualifications, working_times
- Courses: topic, lessons_count, lesson_duration, start_date, end_date

ANALYSIS REQUIREMENTS:
1. Identify column mappings based on headers and sample data
2. Detect data types and formats
3. Suggest data transformations if needed
4. Flag potential issues or inconsistencies

RESPONSE FORMAT:
Return JSON with:
- columnMapping: object mapping CSV columns to database fields
- suggestions: array of improvement recommendations
- warnings: array of potential issues
- confidence: overall confidence score (0-1)`,
      variables: ['HEADERS', 'SAMPLE_DATA', 'TARGET_FIELDS'],
      category: 'data_processing',
      is_active: true
    },

    rationale_generation: {
      type: 'rationale_generation',
      name: 'Assignment Rationale',
      description: 'For generating explanations for assignment decisions',
      template: `You are an assignment explanation system. Provide clear, concise explanations for why teachers are assigned to specific courses.

EXPLANATION REQUIREMENTS:
1. Focus on qualification matching
2. Mention weighting factors that influenced the decision
3. Be professional and educational
4. Keep explanations brief but informative (2-3 sentences)

FACTORS TO CONSIDER:
- Exact qualification matching
- Workload distribution (Equality)
- Lesson scheduling patterns (Continuity)  
- Teacher-course history (Loyalty)
- Conflict resolution

TONE:
Professional, clear, and helpful. Avoid technical jargon.`,
      variables: ['TEACHER_NAME', 'COURSE_TOPIC', 'FACTORS'],
      category: 'explanation',
      is_active: true
    },

    conflict_resolution: {
      type: 'conflict_resolution',
      name: 'Conflict Resolution',
      description: 'For resolving scheduling and assignment conflicts',
      template: `You are a conflict resolution specialist for teacher assignments. Help identify and resolve scheduling conflicts, workload imbalances, and assignment issues.

CONFLICT TYPES TO HANDLE:
- Time slot overlaps
- Overloaded teachers
- Unqualified assignments
- Missing course coverage
- Workload imbalances

RESOLUTION STRATEGIES:
1. Identify root causes
2. Suggest specific alternative assignments
3. Consider emergency weighting adjustments
4. Propose schedule modifications
5. Recommend additional resources if needed

RESPONSE APPROACH:
Be solution-focused and practical. Provide multiple options when possible.`,
      variables: ['CONFLICTS', 'CURRENT_ASSIGNMENTS', 'AVAILABLE_TEACHERS'],
      category: 'problem_solving',
      is_active: true
    }
  };

  /**
   * Get all available prompt templates
   */
  public getAvailablePrompts(): PromptTemplate[] {
    return Object.values(this.defaultPrompts).filter(prompt => prompt.is_active);
  }

  /**
   * Get prompt template by type
   */
  public getPromptTemplate(type: PromptType): PromptTemplate | null {
    return this.defaultPrompts[type] || null;
  }

  /**
   * Get current system prompt from database
   */
  public async getCurrentSystemPrompt(type: PromptType): Promise<string> {
    try {
      const settingKey = `system_prompt_${type}`;
      const db = (typeof window !== 'undefined' && (window as any)?.electronAPI?.database)
        ? (window as any).electronAPI.database
        : (FallbackDatabaseService ? FallbackDatabaseService.getInstance() : null);
      const customPrompt = await db?.getSetting(settingKey);
      
      if (customPrompt) {
        return customPrompt;
      }

      // Return default prompt if no custom one exists
      const defaultPrompt = this.defaultPrompts[type];
      return defaultPrompt ? defaultPrompt.template : '';
    } catch (error) {
      console.error(`Failed to get system prompt for ${type}:`, error);
      const defaultPrompt = this.defaultPrompts[type];
      return defaultPrompt ? defaultPrompt.template : '';
    }
  }

  /**
   * Update system prompt in database
   */
  public async updateSystemPrompt(type: PromptType, prompt: string): Promise<boolean> {
    try {
      const validation = this.validatePrompt(prompt);
      if (!validation.isValid) {
        throw new Error(`Invalid prompt: ${validation.errors.join(', ')}`);
      }

      const settingKey = `system_prompt_${type}`;
      const db = (typeof window !== 'undefined' && (window as any)?.electronAPI?.database)
        ? (window as any).electronAPI.database
        : (FallbackDatabaseService ? FallbackDatabaseService.getInstance() : null);
      await db?.setSetting(settingKey, prompt);
      return true;
    } catch (error) {
      console.error(`Failed to update system prompt for ${type}:`, error);
      return false;
    }
  }

  /**
   * Reset prompt to default
   */
  public async resetPromptToDefault(type: PromptType): Promise<boolean> {
    try {
      const defaultPrompt = this.defaultPrompts[type];
      if (!defaultPrompt) {
        throw new Error(`No default prompt found for type: ${type}`);
      }

      const settingKey = `system_prompt_${type}`;
      const db = (typeof window !== 'undefined' && (window as any)?.electronAPI?.database)
        ? (window as any).electronAPI.database
        : (FallbackDatabaseService ? FallbackDatabaseService.getInstance() : null);
      await db?.setSetting(settingKey, defaultPrompt.template);
      return true;
    } catch (error) {
      console.error(`Failed to reset prompt to default for ${type}:`, error);
      return false;
    }
  }

  /**
   * Process prompt with variables
   */
  public processPromptVariables(template: string, variables: Record<string, string>): string {
    let processedPrompt = template;

    // Replace all {{VARIABLE}} placeholders
    Object.entries(variables).forEach(([key, value]) => {
      const placeholder = `{{${key.toUpperCase()}}}`;
      processedPrompt = processedPrompt.replace(new RegExp(placeholder, 'g'), value);
    });

    // Remove any remaining unprocessed placeholders
    processedPrompt = processedPrompt.replace(/\{\{[^}]+\}\}/g, '[VARIABLE_NOT_PROVIDED]');

    return processedPrompt;
  }

  /**
   * Validate prompt template
   */
  public validatePrompt(prompt: string): PromptValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Basic validation
    if (!prompt || prompt.trim().length === 0) {
      errors.push('Prompt cannot be empty');
    }

    if (prompt.length < 50) {
      warnings.push('Prompt is very short and may not provide sufficient context');
    }

    if (prompt.length > 8000) {
      warnings.push('Prompt is very long and may exceed API limits');
    }

    // Check for potentially problematic content
    const problematicPatterns = [
      { pattern: /ignore.{0,20}previous.{0,20}instructions/i, message: 'Contains potential instruction override attempts' },
      { pattern: /\bdangerous\b|\bharm\b|\battack\b/i, message: 'Contains potentially harmful language' },
      { pattern: /\bpassword\b|\bapi.{0,10}key\b/i, message: 'May contain sensitive information references' }
    ];

    problematicPatterns.forEach(({ pattern, message }) => {
      if (pattern.test(prompt)) {
        warnings.push(message);
      }
    });

    // Check for required elements based on type
    const requiredElements = {
      assignment_optimization: ['qualification', 'weight', 'score', 'json'],
      chat_conversation: ['conversational', 'helpful', 'suggestion'],
      csv_interpretation: ['csv', 'mapping', 'json'],
      rationale_generation: ['explanation', 'rationale'],
      conflict_resolution: ['conflict', 'resolution', 'solution']
    };

    // This validation would be more specific in a real implementation
    if (prompt.toLowerCase().includes('assignment') && 
        !prompt.toLowerCase().includes('qualification')) {
      warnings.push('Assignment-related prompt should mention qualifications');
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      score: Math.max(0, 1 - (errors.length * 0.5) - (warnings.length * 0.1))
    };
  }

  /**
   * Create custom prompt template
   */
  public async createCustomPrompt(
    name: string,
    description: string,
    template: string,
    type: PromptType,
    variables?: string[]
  ): Promise<CustomPromptTemplate | null> {
    try {
      const validation = this.validatePrompt(template);
      if (!validation.isValid) {
        throw new Error(`Invalid prompt template: ${validation.errors.join(', ')}`);
      }

      const customPrompt: CustomPromptTemplate = {
        id: this.generatePromptId(),
        name,
        description,
        template,
        type,
        category: 'core',
        variables: variables || [],
        created_at: new Date().toISOString(),
        is_active: true,
        usage_count: 0
      };

      // Store in database as JSON
      const customPromptsKey = 'custom_prompts';
      const db = (typeof window !== 'undefined' && (window as any)?.electronAPI?.database)
        ? (window as any).electronAPI.database
        : (FallbackDatabaseService ? FallbackDatabaseService.getInstance() : null);
      const existingPrompts = await db?.getSetting(customPromptsKey) || '[]';
      const prompts: CustomPromptTemplate[] = JSON.parse(existingPrompts as string);
      
      prompts.push(customPrompt);
      await db?.setSetting(customPromptsKey, JSON.stringify(prompts));

      return customPrompt;
    } catch (error) {
      console.error('Failed to create custom prompt:', error);
      return null;
    }
  }

  /**
   * Get all custom prompts
   */
  public async getCustomPrompts(): Promise<CustomPromptTemplate[]> {
    try {
      const customPromptsKey = 'custom_prompts';
      const db = (typeof window !== 'undefined' && (window as any)?.electronAPI?.database)
        ? (window as any).electronAPI.database
        : (FallbackDatabaseService ? FallbackDatabaseService.getInstance() : null);
      const existingPrompts = await db?.getSetting(customPromptsKey) || '[]';
      return JSON.parse(existingPrompts as string);
    } catch (error) {
      console.error('Failed to get custom prompts:', error);
      return [];
    }
  }

  /**
   * Delete custom prompt
   */
  public async deleteCustomPrompt(id: string): Promise<boolean> {
    try {
      const customPromptsKey = 'custom_prompts';
      const db = (typeof window !== 'undefined' && (window as any)?.electronAPI?.database)
        ? (window as any).electronAPI.database
        : (FallbackDatabaseService ? FallbackDatabaseService.getInstance() : null);
      const existingPrompts = await db?.getSetting(customPromptsKey) || '[]';
      const prompts: CustomPromptTemplate[] = JSON.parse(existingPrompts as string);
      
      const filteredPrompts = prompts.filter(p => p.id !== id);
      await db?.setSetting(customPromptsKey, JSON.stringify(filteredPrompts));
      
      return prompts.length !== filteredPrompts.length;
    } catch (error) {
      console.error('Failed to delete custom prompt:', error);
      return false;
    }
  }

  /**
   * Get prompt usage statistics
   */
  public async getPromptUsageStats(): Promise<PromptUsageStats> {
    // This would track actual usage in a real implementation
    return {
      total_prompts: Object.keys(this.defaultPrompts).length,
      most_used_type: 'assignment_optimization',
      custom_prompts_count: (await this.getCustomPrompts()).length,
      usage_by_type: Object.keys(this.defaultPrompts).map(type => ({
        type: type as PromptType,
        usage_count: 0,
        success_rate: 0.95
      }))
    };
  }

  /**
   * Export all prompts for backup
   */
  public async exportPrompts(): Promise<PromptExport> {
    const customPrompts = await this.getCustomPrompts();
    
    return {
      default_prompts: Object.values(this.defaultPrompts),
      custom_prompts: customPrompts,
      export_date: new Date().toISOString(),
      version: '1.0'
    };
  }

  /**
   * Import prompts from backup
   */
  public async importPrompts(exportData: PromptExport): Promise<ImportResult> {
    try {
      let imported = 0;
      let skipped = 0;
      
      // Import custom prompts (don't override defaults)
      for (const customPrompt of exportData.custom_prompts) {
        const validation = this.validatePrompt(customPrompt.template);
        if (validation.isValid) {
          // Create with new ID to avoid conflicts
          await this.createCustomPrompt(
            customPrompt.name,
            customPrompt.description,
            customPrompt.template,
            customPrompt.type,
            customPrompt.variables
          );
          imported++;
        } else {
          skipped++;
        }
      }

      return {
        success: true,
        imported_count: imported,
        skipped_count: skipped,
        errors: []
      };
    } catch (error) {
      return {
        success: false,
        imported_count: 0,
        skipped_count: 0,
        errors: [`Import failed: ${error}`]
      };
    }
  }

  /**
   * Generate unique prompt ID
   */
  private generatePromptId(): string {
    return `prompt_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}

// Types for system prompt management
export type PromptType = 
  | 'assignment_optimization' 
  | 'chat_conversation' 
  | 'csv_interpretation' 
  | 'rationale_generation'
  | 'conflict_resolution';

export interface PromptTemplate {
  type: PromptType;
  name: string;
  description: string;
  template: string;
  variables: string[];
  category: 'core' | 'interaction' | 'data_processing' | 'explanation' | 'problem_solving';
  is_active: boolean;
}

export interface CustomPromptTemplate extends PromptTemplate {
  id: string;
  created_at: string;
  usage_count: number;
}

export interface PromptValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  score: number;
}

export interface PromptUsageStats {
  total_prompts: number;
  most_used_type: PromptType;
  custom_prompts_count: number;
  usage_by_type: {
    type: PromptType;
    usage_count: number;
    success_rate: number;
  }[];
}

export interface PromptExport {
  default_prompts: PromptTemplate[];
  custom_prompts: CustomPromptTemplate[];
  export_date: string;
  version: string;
}

export interface ImportResult {
  success: boolean;
  imported_count: number;
  skipped_count: number;
  errors: string[];
}

// Export singleton instance
export const systemPromptService = new SystemPromptService();