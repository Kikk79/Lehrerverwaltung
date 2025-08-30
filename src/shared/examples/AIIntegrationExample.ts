/**
 * Example demonstrating AI Integration & Chat System functionality
 * This file shows how to use the AI services together for assignment optimization
 */

import {
  anthropicService,
  weightingService,
  chatService,
  aiAssignmentService,
  conflictResolutionService,
  chatAssignmentWorkflow
} from '../services';
import { 
  Teacher, 
  Course, 
  Assignment, 
  AssignmentContext,
  WeightingSettings,
  AnthropicConfig
} from '../types';
import { DatabaseService } from '../services/DatabaseService';

/**
 * Example class demonstrating complete AI integration workflow
 */
export class AIIntegrationExample {
  private db: DatabaseService;

  constructor() {
    this.db = DatabaseService.getInstance();
  }

  /**
   * Complete example workflow: Setup AI, create assignments, chat optimization
   */
  public async runCompleteExample(): Promise<void> {
    console.log('🚀 Starting AI Integration Example...');

    try {
      // Step 1: Initialize AI service
      await this.initializeAIService();

      // Step 2: Create sample data
      const { teachers, courses } = await this.createSampleData();

      // Step 3: Generate initial assignments
      const initialAssignments = await this.generateInitialAssignments(teachers, courses);

      // Step 4: Detect and resolve conflicts
      await this.handleConflictResolution(initialAssignments, teachers, courses);

      // Step 5: Demonstrate chat-based optimization
      await this.demonstrateChatOptimization(teachers, courses, initialAssignments);

      // Step 6: Show emergency override capability
      await this.demonstrateEmergencyOverride(teachers, courses, initialAssignments);

      console.log('✅ AI Integration Example completed successfully!');

    } catch (error) {
      console.error('❌ AI Integration Example failed:', error);
    }
  }

  /**
   * Initialize AI service with configuration
   */
  private async initializeAIService(): Promise<void> {
    console.log('🔧 Initializing AI service...');

    const config: AnthropicConfig = {
      apiKey: process.env.ANTHROPIC_API_KEY || 'your-api-key-here',
      model: 'claude-sonnet-4-20250514',
      maxTokens: 4000,
      temperature: 0.3,
      systemPrompt: 'You are an expert teacher assignment optimization system.'
    };

    // Note: In production, API key would be stored securely
    if (config.apiKey === 'your-api-key-here') {
      console.log('⚠️  Using placeholder API key - replace with actual key for testing');
      return;
    }

    await anthropicService.initialize(config);
    console.log('✅ AI service initialized');
  }

  /**
   * Create sample teachers and courses
   */
  private async createSampleData(): Promise<{ teachers: Teacher[]; courses: Course[] }> {
    console.log('📚 Creating sample data...');

    // Sample teachers with different qualifications
    const teacherData = [
      {
        name: 'Dr. Smith',
        qualifications: ['Mathematics', 'Physics'],
        working_times: {
          monday: { start: '08:00', end: '16:00' },
          tuesday: { start: '08:00', end: '16:00' },
          wednesday: { start: '08:00', end: '16:00' },
          thursday: { start: '08:00', end: '16:00' },
          friday: { start: '08:00', end: '14:00' }
        }
      },
      {
        name: 'Prof. Johnson',
        qualifications: ['English', 'Literature'],
        working_times: {
          monday: { start: '09:00', end: '17:00' },
          tuesday: { start: '09:00', end: '17:00' },
          wednesday: { start: '09:00', end: '17:00' },
          thursday: { start: '09:00', end: '17:00' },
          friday: { start: '09:00', end: '15:00' }
        }
      },
      {
        name: 'Ms. Davis',
        qualifications: ['History', 'Social Studies'],
        working_times: {
          monday: { start: '08:30', end: '16:30' },
          tuesday: { start: '08:30', end: '16:30' },
          wednesday: { start: '08:30', end: '16:30' },
          thursday: { start: '08:30', end: '16:30' },
          friday: { start: '08:30', end: '14:30' }
        }
      }
    ];

    // Sample courses
    const courseData = [
      {
        topic: 'Mathematics',
        lessons_count: 20,
        lesson_duration: 60,
        start_date: '2025-09-01',
        end_date: '2025-12-15'
      },
      {
        topic: 'English',
        lessons_count: 18,
        lesson_duration: 50,
        start_date: '2025-09-01',
        end_date: '2025-12-15'
      },
      {
        topic: 'History',
        lessons_count: 15,
        lesson_duration: 45,
        start_date: '2025-09-01',
        end_date: '2025-12-15'
      },
      {
        topic: 'Physics',
        lessons_count: 16,
        lesson_duration: 60,
        start_date: '2025-09-01',
        end_date: '2025-12-15'
      }
    ];

    // Create teachers and courses in database
    const teachers: Teacher[] = [];
    const courses: Course[] = [];

    for (const td of teacherData) {
      teachers.push(this.db.createTeacher(td));
    }

    for (const cd of courseData) {
      courses.push(this.db.createCourse(cd));
    }

    console.log(`✅ Created ${teachers.length} teachers and ${courses.length} courses`);
    return { teachers, courses };
  }

  /**
   * Generate initial assignments using AI optimization
   */
  private async generateInitialAssignments(
    teachers: Teacher[],
    courses: Course[]
  ): Promise<Assignment[]> {
    console.log('🧠 Generating AI-optimized assignments...');

    // Get default weighting settings
    const weightingSettings = this.db.getDefaultWeightingSettings() || 
      weightingService.getDefaultWeightingSettings();

    // Create optimization request
    const request = {
      teachers,
      courses,
      existing_assignments: [],
      weighting_settings: weightingSettings
    };

    try {
      const response = await aiAssignmentService.optimizeAssignments(request);
      
      console.log(`✅ Generated ${response.optimized_assignments.length} optimized assignments`);
      console.log(`📊 AI Rationale: ${response.rationale}`);

      // Save assignments to database
      const assignments: Assignment[] = [];
      for (const optimizedAssignment of response.optimized_assignments) {
        const assignment = this.db.createAssignment({
          teacher_id: optimizedAssignment.teacher.id,
          course_id: optimizedAssignment.course.id,
          scheduled_slots: optimizedAssignment.assignment.scheduled_slots,
          status: 'active',
          ai_rationale: `AI Optimization: ${response.rationale}`
        });
        assignments.push(assignment);
      }

      return assignments;

    } catch (error) {
      console.log('⚠️  AI optimization failed, using fallback assignment logic');
      return this.createFallbackAssignments(teachers, courses);
    }
  }

  /**
   * Demonstrate conflict detection and resolution
   */
  private async handleConflictResolution(
    assignments: Assignment[],
    teachers: Teacher[],
    courses: Course[]
  ): Promise<void> {
    console.log('🔍 Detecting assignment conflicts...');

    const conflicts = conflictResolutionService.detectAllConflicts(assignments, teachers, courses);
    
    if (conflicts.length === 0) {
      console.log('✅ No conflicts detected');
      return;
    }

    console.log(`⚠️  Found ${conflicts.length} conflicts:`);
    conflicts.forEach(c => console.log(`   - ${c.type}: ${c.description} (${c.severity})`));

    // Generate AI-powered resolution suggestions
    const weightingSettings = this.db.getDefaultWeightingSettings() || 
      weightingService.getDefaultWeightingSettings();

    try {
      const suggestions = await conflictResolutionService.generateResolutionSuggestions(conflicts, {
        assignments,
        teachers,
        courses,
        weightingSettings
      });

      console.log(`💡 AI generated ${suggestions.length} resolution suggestions:`);
      suggestions.forEach(s => console.log(`   - ${s.description} (confidence: ${(s.confidence * 100).toFixed(1)}%)`));

    } catch (error) {
      console.log('⚠️  Failed to generate AI conflict resolution suggestions');
    }
  }

  /**
   * Demonstrate chat-based assignment optimization
   */
  private async demonstrateChatOptimization(
    teachers: Teacher[],
    courses: Course[],
    assignments: Assignment[]
  ): Promise<void> {
    console.log('💬 Starting chat-based assignment optimization...');

    const weightingSettings = this.db.getDefaultWeightingSettings() || 
      weightingService.getDefaultWeightingSettings();

    const context: AssignmentContext = {
      teachers,
      courses,
      current_assignments: assignments,
      conflicts: [],
      weighting_settings: weightingSettings
    };

    try {
      // Start a chat conversation
      const chatResult = await chatAssignmentWorkflow.startAssignmentModification(
        context,
        'I notice the workload seems uneven among teachers. Can you help balance it?'
      );

      console.log(`✅ Started chat conversation: ${chatResult.conversationId}`);
      console.log(`🤖 AI Response: ${chatResult.initialResponse.message_content}`);
      
      if (chatResult.suggestions.length > 0) {
        console.log(`💡 AI Suggestions:`);
        chatResult.suggestions.forEach(s => 
          console.log(`   - ${s.description} (${(s.confidence * 100).toFixed(1)}% confidence)`)
        );
      }

      // Process a follow-up request
      const followUpResult = await chatAssignmentWorkflow.processModificationRequest(
        chatResult.conversationId,
        'What if we prioritize teacher continuity over equal distribution?',
        context
      );

      console.log(`🔄 Follow-up response: ${followUpResult.response.message_content}`);

    } catch (error) {
      console.log('⚠️  Chat optimization demonstration failed:', error);
    }
  }

  /**
   * Demonstrate emergency override functionality
   */
  private async demonstrateEmergencyOverride(
    teachers: Teacher[],
    courses: Course[],
    assignments: Assignment[]
  ): Promise<void> {
    console.log('🚨 Demonstrating emergency override...');

    const context: AssignmentContext = {
      teachers,
      courses,
      current_assignments: assignments,
      conflicts: [],
      weighting_settings: weightingService.getDefaultWeightingSettings()
    };

    try {
      // Start emergency conversation
      const conversationId = await chatService.startConversation(
        context,
        'Emergency Assignment Override'
      );

      const emergencyResult = await chatAssignmentWorkflow.handleEmergencyOverride(
        conversationId,
        'Teacher illness requires immediate reassignment',
        context
      );

      console.log(`🚨 Emergency override applied:`);
      console.log(`   Settings: ${emergencyResult.emergency_settings.profile_name}`);
      console.log(`   New assignments: ${emergencyResult.new_assignments.length}`);
      console.log(`   Rationale: ${emergencyResult.rationale}`);

    } catch (error) {
      console.log('⚠️  Emergency override demonstration failed:', error);
    }
  }

  /**
   * Create fallback assignments when AI is unavailable
   */
  private createFallbackAssignments(teachers: Teacher[], courses: Course[]): Assignment[] {
    console.log('🔄 Creating fallback assignments...');

    const assignments: Assignment[] = [];
    let assignmentId = 1;

    for (const course of courses) {
      // Find first teacher with exact qualification match
      const qualifiedTeacher = teachers.find(t => t.qualifications.includes(course.topic));
      
      if (qualifiedTeacher) {
        const assignment = this.db.createAssignment({
          teacher_id: qualifiedTeacher.id,
          course_id: course.id,
          scheduled_slots: [],
          status: 'pending',
          ai_rationale: 'Fallback assignment - exact qualification match'
        });
        assignments.push(assignment);
      }
    }

    console.log(`✅ Created ${assignments.length} fallback assignments`);
    return assignments;
  }

  /**
   * Show weighting system examples
   */
  public demonstrateWeightingSystem(): void {
    console.log('⚖️  Demonstrating weighting system...');

    // Show different weighting profiles
    const profiles = [
      weightingService.getDefaultWeightingSettings(),
      weightingService.getEmergencyWeightingSettings(),
      weightingService.getContinuityWeightingSettings()
    ];

    profiles.forEach(profile => {
      console.log(`📊 Profile: ${profile.profile_name}`);
      console.log(`   Equality: ${profile.equality_weight}%`);
      console.log(`   Continuity: ${profile.continuity_weight}%`);
      console.log(`   Loyalty: ${profile.loyalty_weight}%`);
      
      const validation = weightingService.validateWeightingSettings(profile);
      console.log(`   Valid: ${validation.isValid}`);
      if (!validation.isValid) {
        console.log(`   Errors: ${validation.errors.join(', ')}`);
      }
    });
  }

  /**
   * Show chat service capabilities
   */
  public async demonstrateChatCapabilities(): Promise<void> {
    console.log('💬 Demonstrating chat capabilities...');

    // Mock context
    const mockContext: AssignmentContext = {
      teachers: [],
      courses: [],
      current_assignments: [],
      conflicts: [],
      weighting_settings: weightingService.getDefaultWeightingSettings()
    };

    try {
      // Start conversation
      const conversationId = await chatService.startConversation(
        mockContext,
        'Chat Demo'
      );

      // Send test messages
      await chatService.sendMessage(conversationId, 'Hello, can you help with assignments?');
      await chatService.sendMessage(conversationId, 'What weighting settings do you recommend?');

      const conversation = chatService.getConversation(conversationId);
      console.log(`✅ Chat conversation created with ${conversation?.messages.length} messages`);

      // Generate quick suggestions
      const suggestions = await chatService.generateQuickSuggestions(mockContext);
      console.log(`💡 Generated ${suggestions.length} quick suggestions`);

    } catch (error) {
      console.log('⚠️  Chat demonstration failed (possibly due to missing API key)');
    }
  }
}

/**
 * Utility function to run the example
 */
export async function runAIIntegrationExample(): Promise<void> {
  const example = new AIIntegrationExample();
  
  console.log('🎯 Running AI Integration & Chat System Example');
  console.log('================================================');
  
  // Run different parts of the example
  await example.runCompleteExample();
  example.demonstrateWeightingSystem();
  await example.demonstrateChatCapabilities();
  
  console.log('================================================');
  console.log('🎉 AI Integration Example completed!');
}