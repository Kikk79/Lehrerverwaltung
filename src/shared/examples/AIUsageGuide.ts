/**
 * Complete usage guide for AI Integration & Chat System
 * Demonstrates how to use all AI components in real application scenarios
 */

import {
  anthropicService,
  weightingService,
  chatService,
  aiAssignmentService,
  conflictResolutionService,
  chatAssignmentWorkflow
} from '../services';
import { DatabaseService } from '../services/DatabaseService';
import { PromptTemplates } from '../templates/PromptTemplates';
import { 
  AnthropicConfig,
  WeightingSettings,
  AssignmentContext,
  Teacher,
  Course,
  Assignment
} from '../types';

/**
 * Complete AI integration usage guide with practical examples
 */
export class AIUsageGuide {
  private db: DatabaseService;

  constructor() {
    this.db = DatabaseService.getInstance();
  }

  /**
   * STEP 1: Initialize AI service with proper configuration
   */
  public async initializeAI(): Promise<void> {
    console.log('📋 STEP 1: Initializing AI Service');

    // Get stored API key from database (in production)
    const apiKey = this.db.getSetting('ai_api_key') || 'your-anthropic-api-key';
    
    const config: AnthropicConfig = {
      apiKey: apiKey,
      model: 'claude-sonnet-4-20250514', // Latest model
      maxTokens: 4000,
      temperature: 0.3, // Lower temperature for more consistent results
      systemPrompt: 'You are a teacher assignment optimization expert.'
    };

    try {
      await anthropicService.initialize(config);
      console.log('✅ AI service initialized successfully');
      
      // Store successful configuration
      this.db.setSetting('ai_model', config.model);
      this.db.setSetting('ai_max_tokens', config.maxTokens.toString());
      this.db.setSetting('ai_temperature', config.temperature.toString());
      
    } catch (error) {
      console.error('❌ Failed to initialize AI service:', error);
      throw new Error('AI initialization failed. Check your API key and network connection.');
    }
  }

  /**
   * STEP 2: Set up weighting preferences
   */
  public setupWeightingProfiles(): void {
    console.log('📋 STEP 2: Setting up Weighting Profiles');

    // Create custom weighting profile for your organization
    const customProfile: WeightingSettings = {
      profile_name: 'School District Policy',
      equality_weight: 50,    // High priority on fair distribution
      continuity_weight: 30,  // Moderate priority on consecutive lessons
      loyalty_weight: 20,     // Lower priority on maintaining relationships
      is_default: false
    };

    try {
      const created = this.db.createWeightingSettings(customProfile);
      console.log(`✅ Created custom weighting profile: ${created.profile_name}`);

      // Show all available profiles
      const allProfiles = this.db.getAllWeightingSettings();
      console.log(`📊 Available profiles: ${allProfiles.map(p => p.profile_name).join(', ')}`);

    } catch (error) {
      console.error('❌ Failed to create weighting profile:', error);
    }
  }

  /**
   * STEP 3: Generate AI-optimized assignments
   */
  public async generateOptimizedAssignments(
    teachers: Teacher[],
    courses: Course[]
  ): Promise<Assignment[]> {
    console.log('📋 STEP 3: Generating AI-Optimized Assignments');

    // Get current weighting settings
    const weightingSettings = this.db.getDefaultWeightingSettings() || 
      weightingService.getDefaultWeightingSettings();

    // Prepare optimization request
    const optimizationRequest = {
      teachers,
      courses,
      existing_assignments: this.db.getAllAssignments(),
      weighting_settings: weightingSettings
    };

    try {
      const response = await aiAssignmentService.optimizeAssignments(optimizationRequest);
      
      console.log(`✅ AI generated ${response.optimized_assignments.length} optimized assignments`);
      console.log(`📝 AI Rationale: ${response.rationale}`);
      
      if (response.conflicts_resolved.length > 0) {
        console.log(`🔧 Resolved ${response.conflicts_resolved.length} conflicts`);
      }

      // Save optimized assignments to database
      const savedAssignments: Assignment[] = [];
      for (const optimized of response.optimized_assignments) {
        const assignment = this.db.createAssignment({
          teacher_id: optimized.teacher.id,
          course_id: optimized.course.id,
          scheduled_slots: optimized.assignment.scheduled_slots,
          status: 'active',
          ai_rationale: response.rationale
        });
        savedAssignments.push(assignment);
      }

      return savedAssignments;

    } catch (error) {
      console.error('❌ AI optimization failed:', error);
      throw new Error('Failed to generate AI-optimized assignments. Check your API configuration.');
    }
  }

  /**
   * STEP 4: Handle conflicts through AI assistance
   */
  public async handleConflicts(
    assignments: Assignment[],
    teachers: Teacher[],
    courses: Course[]
  ): Promise<void> {
    console.log('📋 STEP 4: AI-Powered Conflict Resolution');

    // Detect all conflicts
    const conflicts = conflictResolutionService.detectAllConflicts(assignments, teachers, courses);
    
    if (conflicts.length === 0) {
      console.log('✅ No conflicts detected - assignments are optimal!');
      return;
    }

    console.log(`⚠️  Detected ${conflicts.length} conflicts:`);
    conflicts.forEach(c => console.log(`   - ${c.type}: ${c.description} (${c.severity})`));

    // Get AI suggestions for resolution
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
      suggestions.forEach(s => 
        console.log(`   - ${s.description} (confidence: ${(s.confidence * 100).toFixed(1)}%)`)
      );

      // Attempt automatic resolution
      const autoResolution = await conflictResolutionService.autoResolveConflicts(conflicts, {
        assignments,
        teachers,
        courses
      });

      console.log(`🔧 Auto-resolved: ${autoResolution.resolved.length}, Remaining: ${autoResolution.remaining.length}`);

    } catch (error) {
      console.error('❌ Conflict resolution failed:', error);
    }
  }

  /**
   * STEP 5: Interactive chat optimization
   */
  public async interactiveChatOptimization(
    teachers: Teacher[],
    courses: Course[],
    assignments: Assignment[]
  ): Promise<void> {
    console.log('📋 STEP 5: Interactive Chat Optimization');

    const weightingSettings = this.db.getDefaultWeightingSettings() || 
      weightingService.getDefaultWeightingSettings();

    const context: AssignmentContext = {
      teachers,
      courses,
      current_assignments: assignments,
      conflicts: conflictResolutionService.detectAllConflicts(assignments, teachers, courses),
      weighting_settings: weightingSettings
    };

    try {
      // Start interactive chat session
      const chatResult = await chatAssignmentWorkflow.startAssignmentModification(
        context,
        'Hello! I would like to review and optimize our current teacher assignments. Can you analyze our situation?'
      );

      console.log(`💬 Started chat session: ${chatResult.conversationId}`);
      console.log(`🤖 AI: ${chatResult.initialResponse.message_content}`);

      if (chatResult.suggestions.length > 0) {
        console.log(`💡 AI Suggestions:`);
        chatResult.suggestions.forEach(s => 
          console.log(`   - ${s.description} (${(s.confidence * 100).toFixed(1)}% confidence)`)
        );
      }

      // Example follow-up questions
      const followUpQuestions = [
        'What would happen if we prioritize teacher continuity over equal distribution?',
        'Can you suggest which teachers might be overloaded?',
        'How would emergency scheduling look if we had a teacher absence?'
      ];

      for (const question of followUpQuestions) {
        console.log(`\n👤 User: ${question}`);
        
        try {
          const response = await chatAssignmentWorkflow.processModificationRequest(
            chatResult.conversationId,
            question,
            context
          );

          console.log(`🤖 AI: ${response.response.message_content.substring(0, 150)}...`);
          
          if (response.actionableChanges.length > 0) {
            console.log(`🔧 Suggested changes: ${response.actionableChanges.length}`);
            console.log(`⚠️  Requires confirmation: ${response.requiresConfirmation}`);
          }

        } catch (error) {
          console.log(`⚠️  Chat response failed: ${error}`);
        }
      }

    } catch (error) {
      console.error('❌ Interactive chat failed:', error);
    }
  }

  /**
   * STEP 6: Emergency override demonstration
   */
  public async demonstrateEmergencyOverride(
    teachers: Teacher[],
    courses: Course[],
    assignments: Assignment[]
  ): Promise<void> {
    console.log('📋 STEP 6: Emergency Override Capability');

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
        'Emergency Override Session'
      );

      // Trigger emergency override
      const emergencyResult = await chatAssignmentWorkflow.handleEmergencyOverride(
        conversationId,
        'Teacher Smith called in sick and we need immediate coverage for Mathematics courses',
        context
      );

      console.log(`🚨 Emergency Override Applied:`);
      console.log(`   Profile: ${emergencyResult.emergency_settings.profile_name}`);
      console.log(`   Equality: ${emergencyResult.emergency_settings.equality_weight}%`);
      console.log(`   Continuity: ${emergencyResult.emergency_settings.continuity_weight}%`);
      console.log(`   Loyalty: ${emergencyResult.emergency_settings.loyalty_weight}% (overridden)`);
      console.log(`   New assignments: ${emergencyResult.new_assignments.length}`);
      console.log(`   Rationale: ${emergencyResult.rationale.substring(0, 100)}...`);

    } catch (error) {
      console.error('❌ Emergency override failed:', error);
    }
  }

  /**
   * Complete workflow demonstration
   */
  public async runCompleteWorkflow(): Promise<void> {
    console.log('🚀 AI Integration Complete Workflow Demo');
    console.log('==========================================');

    try {
      // Step 1: Initialize AI
      await this.initializeAI();
      console.log('');

      // Step 2: Setup weighting
      this.setupWeightingProfiles();
      console.log('');

      // Get sample data (would normally come from UI)
      const teachers = this.db.getAllTeachers();
      const courses = this.db.getAllCourses();

      if (teachers.length === 0 || courses.length === 0) {
        console.log('⚠️  No sample data found. Please add teachers and courses first.');
        return;
      }

      // Step 3: Generate assignments
      const assignments = await this.generateOptimizedAssignments(teachers, courses);
      console.log('');

      // Step 4: Handle conflicts
      await this.handleConflicts(assignments, teachers, courses);
      console.log('');

      // Step 5: Interactive chat
      await this.interactiveChatOptimization(teachers, courses, assignments);
      console.log('');

      // Step 6: Emergency override
      await this.demonstrateEmergencyOverride(teachers, courses, assignments);

      console.log('==========================================');
      console.log('🎉 Complete AI workflow demonstration finished!');
      console.log('');
      console.log('📊 Final Database Stats:');
      const stats = this.db.getStats();
      console.log(`   Teachers: ${stats.teachers}`);
      console.log(`   Courses: ${stats.courses}`);
      console.log(`   Assignments: ${stats.assignments}`);
      console.log(`   Weighting Profiles: ${stats.weighting_profiles}`);
      console.log(`   Chat Conversations: ${stats.chat_conversations}`);
      console.log(`   Chat Messages: ${stats.chat_messages}`);

    } catch (error) {
      console.error('❌ Workflow demonstration failed:', error);
    }
  }

  /**
   * Quick setup helper for testing
   */
  public async quickTestSetup(): Promise<{ teachers: Teacher[]; courses: Course[] }> {
    console.log('🔧 Quick Test Setup');

    // Create test teachers if none exist
    if (this.db.getAllTeachers().length === 0) {
      const testTeachers = [
        {
          name: 'Dr. Alice Smith',
          qualifications: ['Mathematics', 'Statistics'],
          working_times: {
            monday: { start: '08:00', end: '16:00' },
            tuesday: { start: '08:00', end: '16:00' },
            wednesday: { start: '08:00', end: '16:00' },
            thursday: { start: '08:00', end: '16:00' },
            friday: { start: '08:00', end: '14:00' }
          }
        },
        {
          name: 'Prof. Bob Johnson',
          qualifications: ['Physics', 'Engineering'],
          working_times: {
            monday: { start: '09:00', end: '17:00' },
            tuesday: { start: '09:00', end: '17:00' },
            wednesday: { start: '09:00', end: '17:00' },
            thursday: { start: '09:00', end: '17:00' },
            friday: { start: '09:00', end: '15:00' }
          }
        }
      ];

      for (const teacherData of testTeachers) {
        this.db.createTeacher(teacherData);
      }
    }

    // Create test courses if none exist
    if (this.db.getAllCourses().length === 0) {
      const testCourses = [
        {
          topic: 'Mathematics',
          lessons_count: 20,
          lesson_duration: 60,
          start_date: '2025-09-01',
          end_date: '2025-12-15'
        },
        {
          topic: 'Physics',
          lessons_count: 18,
          lesson_duration: 55,
          start_date: '2025-09-01',
          end_date: '2025-12-15'
        }
      ];

      for (const courseData of testCourses) {
        this.db.createCourse(courseData);
      }
    }

    const teachers = this.db.getAllTeachers();
    const courses = this.db.getAllCourses();

    console.log(`✅ Setup complete: ${teachers.length} teachers, ${courses.length} courses`);
    return { teachers, courses };
  }
}

/**
 * Utility functions for common AI operations
 */
export class AIUtilities {

  /**
   * Get current AI configuration status
   */
  public static getAIStatus(): {
    isConfigured: boolean;
    model: string | null;
    hasApiKey: boolean;
    requestCount: number;
  } {
    const config = anthropicService.getConfig();
    const stats = anthropicService.getStats();

    return {
      isConfigured: stats.isInitialized,
      model: config?.model || null,
      hasApiKey: !!config?.apiKey && config.apiKey !== 'your-anthropic-api-key',
      requestCount: stats.requestCount
    };
  }

  /**
   * Get weighting system status
   */
  public static getWeightingStatus(): {
    availableProfiles: number;
    defaultProfile: string | null;
    isValid: boolean;
  } {
    const db = DatabaseService.getInstance();
    const profiles = db.getAllWeightingSettings();
    const defaultProfile = db.getDefaultWeightingSettings();

    return {
      availableProfiles: profiles.length,
      defaultProfile: defaultProfile?.profile_name || null,
      isValid: profiles.length > 0
    };
  }

  /**
   * Get chat system status
   */
  public static getChatStatus(): {
    activeConversations: number;
    totalMessages: number;
    lastActivity: string | null;
  } {
    const db = DatabaseService.getInstance();
    const stats = db.getStats();
    const conversations = db.getAllChatConversations();
    
    const lastActivity = conversations.length > 0 
      ? conversations[0].updated_at || null
      : null;

    return {
      activeConversations: stats.chat_conversations,
      totalMessages: stats.chat_messages,
      lastActivity
    };
  }

  /**
   * Create quick assignment context for testing
   */
  public static createTestContext(): AssignmentContext {
    const db = DatabaseService.getInstance();
    
    return {
      teachers: db.getAllTeachers(),
      courses: db.getAllCourses(),
      current_assignments: db.getAllAssignments(),
      conflicts: [],
      weighting_settings: db.getDefaultWeightingSettings() || 
        weightingService.getDefaultWeightingSettings()
    };
  }
}

/**
 * Main function to run complete AI integration demonstration
 */
export async function demonstrateAIIntegration(): Promise<void> {
  console.log('🚀 Starting Complete AI Integration Demonstration');
  console.log('=================================================');

  const guide = new AIUsageGuide();

  try {
    // Quick setup
    await guide.quickTestSetup();
    
    // Run complete workflow
    await guide.runCompleteWorkflow();

    // Show final status
    console.log('');
    console.log('📊 Final AI System Status:');
    console.log('AI Service:', AIUtilities.getAIStatus());
    console.log('Weighting System:', AIUtilities.getWeightingStatus());
    console.log('Chat System:', AIUtilities.getChatStatus());

  } catch (error) {
    console.error('❌ AI integration demonstration failed:', error);
  }

  console.log('=================================================');
}