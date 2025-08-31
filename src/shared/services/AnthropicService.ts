import Anthropic from '@anthropic-ai/sdk';
import { 
  AnthropicConfig, 
  AIResponse, 
  AIError,
  AnthropicModel,
  AIAssignmentOptimizationRequest,
  AIOptimizationResponse
} from '../types';

/**
 * Service for interacting with the Anthropic Claude API
 * Handles authentication, error handling, rate limiting, and response parsing
 */
export class AnthropicService {
  private client: Anthropic | null = null;
  private config: AnthropicConfig | null = null;
  private requestCount = 0;
  private lastRequestTime = 0;
  private readonly MIN_REQUEST_INTERVAL = 1000; // 1 second between requests

  /**
   * Initialize the Anthropic client with configuration
   */
  public async initialize(config: AnthropicConfig): Promise<void> {
    if (!config.apiKey) {
      throw new Error('API key is required to initialize AnthropicService');
    }

    this.config = config;
    this.client = new Anthropic({
      apiKey: config.apiKey,
      maxRetries: 3,
      timeout: 60000, // 60 seconds
    });

    // Test the connection
    try {
      await this.testConnection();
    } catch (error) {
      throw new Error(`Failed to initialize Anthropic client: ${this.formatError(error).message}`);
    }
  }

  /**
   * Test the API connection with a simple request
   */
  private async testConnection(): Promise<void> {
    if (!this.client || !this.config) {
      throw new Error('Client not initialized');
    }

    await this.client.messages.create({
      model: this.config.model,
      max_tokens: 10,
      messages: [{ role: 'user', content: 'Test connection' }],
    });
  }

  /**
   * Send a message to Claude and get a response
   */
  public async sendMessage(
    message: string,
    systemPrompt?: string,
    model?: AnthropicModel
  ): Promise<AIResponse> {
    if (!this.client || !this.config) {
      throw new Error('AnthropicService not initialized. Call initialize() first.');
    }

    await this.enforceRateLimit();

    try {
      const response = await this.client.messages.create({
        model: model || this.config.model,
        max_tokens: this.config.maxTokens,
        temperature: this.config.temperature,
        system: systemPrompt || this.config.systemPrompt,
        messages: [{ role: 'user', content: message }],
      });

      this.requestCount++;

      const content = response.content
        .filter(block => block.type === 'text')
        .map(block => (block as any).text)
        .join('');

      return {
        content,
        usage: response.usage,
        request_id: (response as any)._request_id,
      };
    } catch (error) {
      throw this.formatError(error);
    }
  }

  /**
   * Send a streaming message to Claude
   */
  public async sendStreamingMessage(
    message: string,
    systemPrompt?: string,
    model?: AnthropicModel,
    onChunk?: (chunk: string) => void
  ): Promise<AIResponse> {
    if (!this.client || !this.config) {
      throw new Error('AnthropicService not initialized. Call initialize() first.');
    }

    await this.enforceRateLimit();

    try {
      const stream = this.client.messages.stream({
        model: model || this.config.model,
        max_tokens: this.config.maxTokens,
        temperature: this.config.temperature,
        system: systemPrompt || this.config.systemPrompt,
        messages: [{ role: 'user', content: message }],
      });

      let fullContent = '';
      
      stream.on('text', (text) => {
        fullContent += text;
        onChunk?.(text);
      });

      const finalMessage = await stream.finalMessage();
      this.requestCount++;

      return {
        content: fullContent,
        usage: finalMessage.usage,
        request_id: (finalMessage as any)._request_id,
      };
    } catch (error) {
      throw this.formatError(error);
    }
  }

  /**
   * Optimize assignments using AI
   */
  public async optimizeAssignments(
    request: AIAssignmentOptimizationRequest
  ): Promise<AIOptimizationResponse> {
    const systemPrompt = this.buildOptimizationSystemPrompt();
    const userPrompt = this.buildOptimizationUserPrompt(request);

    const response = await this.sendMessage(userPrompt, systemPrompt);

    try {
      return JSON.parse(response.content);
    } catch (error) {
      throw new Error(`Failed to parse AI optimization response: ${error}`);
    }
  }

  /**
   * Generate assignment rationale
   */
  public async generateAssignmentRationale(
    teacherName: string,
    courseTopic: string,
    reasons: string[]
  ): Promise<string> {
    const systemPrompt = 'You are an assignment explanation system. Provide clear, concise explanations for why teachers are assigned to specific courses.';
    
    const userPrompt = `Explain why teacher "${teacherName}" was assigned to course "${courseTopic}". 
    Factors considered: ${reasons.join(', ')}
    
    Provide a brief, professional explanation (2-3 sentences).`;

    const response = await this.sendMessage(userPrompt, systemPrompt);
    return response.content;
  }

  /**
   * Interpret CSV data for import
   */
  public async interpretCSVData(
    headers: string[],
    sampleRows: string[][]
  ): Promise<{ columnMapping: Record<string, string>; suggestions: string[] }> {
    const systemPrompt = `You are a CSV interpretation system. Analyze CSV headers and data to map columns to database fields.
    Available fields: name, qualifications, working_times, topic, lessons_count, lesson_duration, start_date, end_date`;

    const userPrompt = `Analyze this CSV data:
    Headers: ${headers.join(', ')}
    Sample rows: ${sampleRows.map(row => row.join(', ')).join('\n')}
    
    Return JSON with columnMapping object and suggestions array.`;

    const response = await this.sendMessage(userPrompt, systemPrompt);
    
    try {
      return JSON.parse(response.content);
    } catch (error) {
      throw new Error(`Failed to parse CSV interpretation response: ${error}`);
    }
  }

  /**
   * Build system prompt for assignment optimization
   */
  private buildOptimizationSystemPrompt(): string {
    return `You are an intelligent teacher-course assignment optimization system. Your goal is to create optimal assignments based on exact qualification matching and weighted scoring criteria.

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
Provide alternative solutions when conflicts exist.`;
  }

  /**
   * Build user prompt for assignment optimization
   */
  private buildOptimizationUserPrompt(request: AIAssignmentOptimizationRequest): string {
    return `Optimize teacher assignments for the following data:

TEACHERS:
${request.teachers.map(t => `- ${t.name}: Qualifications: ${t.qualifications.join(', ')}`).join('\n')}

COURSES:
${request.courses.map(c => `- ${c.topic}: ${c.lessons_count} lessons, ${c.lesson_duration}min each`).join('\n')}

WEIGHTING SETTINGS:
- Equality Weight: ${request.weighting_settings.equality_weight}%
- Continuity Weight: ${request.weighting_settings.continuity_weight}%
- Loyalty Weight: ${request.weighting_settings.loyalty_weight}%

EXISTING ASSIGNMENTS:
${request.existing_assignments?.map(a => `Assignment ${a.id}: Teacher ${a.teacher_id} → Course ${a.course_id}`).join('\n') || 'None'}

${request.chat_context ? `CHAT CONTEXT: ${request.chat_context}` : ''}

Optimize assignments considering the weighting factors and provide the response in the specified JSON format.`;
  }

  /**
   * Enforce rate limiting between requests
   */
  private async enforceRateLimit(): Promise<void> {
    const now = Date.now();
    const timeSinceLastRequest = now - this.lastRequestTime;
    
    if (timeSinceLastRequest < this.MIN_REQUEST_INTERVAL) {
      const delay = this.MIN_REQUEST_INTERVAL - timeSinceLastRequest;
      await new Promise(resolve => setTimeout(resolve, delay));
    }
    
    this.lastRequestTime = Date.now();
  }

  /**
   * Format errors into standard AIError interface
   */
  private formatError(error: any): AIError {
    if (error instanceof Anthropic.APIError) {
      let type: AIError['type'] = 'api_error';
      
      if (error instanceof Anthropic.RateLimitError) {
        type = 'rate_limit';
      } else if (error instanceof Anthropic.AuthenticationError) {
        type = 'authentication';
      } else if (error instanceof Anthropic.APIConnectionError) {
        type = 'network';
      } else if (error.status === 408 || error.message.includes('timeout')) {
        type = 'timeout';
      }

      return {
        type,
        message: error.message,
        code: (error as any).type || 'unknown',
        status: error.status,
      };
    }

    return {
      type: 'api_error',
      message: error.message || 'Unknown error occurred',
    };
  }

  /**
   * Get current configuration
   */
  public getConfig(): AnthropicConfig | null {
    return this.config;
  }

  /**
   * Get request statistics
   */
  public getStats(): { requestCount: number; isInitialized: boolean } {
    return {
      requestCount: this.requestCount,
      isInitialized: this.client !== null,
    };
  }

  /**
   * Update configuration without reinitializing
   */
  public updateConfig(updates: Partial<AnthropicConfig>): void {
    if (!this.config) {
      throw new Error('Service not initialized');
    }
    
    this.config = { ...this.config, ...updates };
  }
}

// Export singleton instance
export const anthropicService = new AnthropicService();