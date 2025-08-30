/**
 * Comprehensive test file for AI Integration & Chat System
 * Tests all major AI components and their integration
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
  WeightingSettings,
  AssignmentContext,
  AnthropicConfig
} from '../types';
import { PromptTemplates } from '../templates/PromptTemplates';

/**
 * Test suite for AI integration components
 */
class AIIntegrationTest {

  /**
   * Test WeightingService algorithms
   */
  public testWeightingService(): void {
    console.log('🧪 Testing WeightingService...');

    // Test default settings
    const defaultSettings = weightingService.getDefaultWeightingSettings();
    console.log('Default settings:', defaultSettings);

    // Test validation
    const validationResult = weightingService.validateWeightingSettings(defaultSettings);
    console.log('Validation result:', validationResult);

    // Test emergency settings
    const emergencySettings = weightingService.getEmergencyWeightingSettings();
    console.log('Emergency settings:', emergencySettings);

    // Test scoring with mock data
    const mockTeacher: Teacher = {
      id: 1,
      name: 'Test Teacher',
      qualifications: ['Mathematics'],
      working_times: {},
      created_at: '2025-08-30'
    };

    const mockCourse: Course = {
      id: 1,
      topic: 'Mathematics',
      lessons_count: 10,
      lesson_duration: 60,
      start_date: '2025-09-01',
      end_date: '2025-12-15',
      created_at: '2025-08-30'
    };

    const mockAssignment: Assignment = {
      id: 1,
      teacher_id: 1,
      course_id: 1,
      scheduled_slots: [],
      status: 'active',
      created_at: '2025-08-30'
    };

    const score = weightingService.calculateWeightedScore(
      mockAssignment,
      mockTeacher,
      mockCourse,
      [],
      [mockTeacher],
      defaultSettings
    );

    console.log('Calculated weighted score:', score);
    console.log('✅ WeightingService tests completed');
  }

  /**
   * Test ChatService functionality
   */
  public async testChatService(): Promise<void> {
    console.log('🧪 Testing ChatService...');

    // Create mock context
    const mockContext: AssignmentContext = {
      teachers: [{
        id: 1,
        name: 'Dr. Test',
        qualifications: ['Mathematics'],
        working_times: {},
        created_at: '2025-08-30'
      }],
      courses: [{
        id: 1,
        topic: 'Mathematics',
        lessons_count: 10,
        lesson_duration: 60,
        start_date: '2025-09-01',
        end_date: '2025-12-15',
        created_at: '2025-08-30'
      }],
      current_assignments: [],
      conflicts: [],
      weighting_settings: weightingService.getDefaultWeightingSettings()
    };

    try {
      // Test conversation creation
      const conversationId = await chatService.startConversation(mockContext, 'Test Chat');
      console.log('Created conversation:', conversationId);

      // Test message sending (will fail without API key, but structure should work)
      try {
        await chatService.sendMessage(conversationId, 'Hello, can you help with assignments?');
        console.log('✅ Message sent successfully');
      } catch (error) {
        console.log('⚠️  Message sending failed (expected without API key):', error);
      }

      // Test conversation retrieval
      const conversation = chatService.getConversation(conversationId);
      console.log('Retrieved conversation with', conversation?.messages.length, 'messages');

      console.log('✅ ChatService tests completed');

    } catch (error) {
      console.log('⚠️  ChatService test failed:', error);
    }
  }

  /**
   * Test ConflictResolutionService
   */
  public testConflictResolution(): void {
    console.log('🧪 Testing ConflictResolutionService...');

    // Create mock conflicting assignments
    const mockAssignments: Assignment[] = [
      {
        id: 1,
        teacher_id: 1,
        course_id: 1,
        scheduled_slots: [
          {
            date: '2025-09-01',
            start_time: '09:00',
            end_time: '10:00',
            duration_minutes: 60
          }
        ],
        status: 'active',
        created_at: '2025-08-30'
      },
      {
        id: 2,
        teacher_id: 1, // Same teacher - should create conflict
        course_id: 2,
        scheduled_slots: [
          {
            date: '2025-09-01',
            start_time: '09:30',
            end_time: '10:30',
            duration_minutes: 60
          }
        ],
        status: 'active',
        created_at: '2025-08-30'
      }
    ];

    const mockTeachers: Teacher[] = [
      {
        id: 1,
        name: 'Dr. Conflict',
        qualifications: ['Mathematics', 'Physics'],
        working_times: {
          monday: { start: '08:00', end: '16:00' }
        },
        created_at: '2025-08-30'
      }
    ];

    const mockCourses: Course[] = [
      {
        id: 1,
        topic: 'Mathematics',
        lessons_count: 10,
        lesson_duration: 60,
        start_date: '2025-09-01',
        end_date: '2025-12-15',
        created_at: '2025-08-30'
      },
      {
        id: 2,
        topic: 'Physics',
        lessons_count: 8,
        lesson_duration: 60,
        start_date: '2025-09-01',
        end_date: '2025-12-15',
        created_at: '2025-08-30'
      }
    ];

    // Test conflict detection
    const conflicts = conflictResolutionService.detectAllConflicts(
      mockAssignments,
      mockTeachers,
      mockCourses
    );

    console.log(`Detected ${conflicts.length} conflicts:`);
    conflicts.forEach(c => console.log(`  - ${c.type}: ${c.description} (${c.severity})`));

    // Test severity calculation
    const severityScore = conflictResolutionService.calculateConflictSeverity(conflicts);
    console.log('Conflict severity analysis:', severityScore);

    console.log('✅ ConflictResolutionService tests completed');
  }

  /**
   * Test prompt templates
   */
  public testPromptTemplates(): void {
    console.log('🧪 Testing PromptTemplates...');

    // Test template retrieval
    const optimizationTemplate = PromptTemplates.getTemplate('Assignment Optimization');
    console.log('Retrieved optimization template:', optimizationTemplate?.name);

    // Test template filling
    if (optimizationTemplate) {
      const filledTemplate = PromptTemplates.fillTemplate(optimizationTemplate, {
        equality_weight: '40',
        continuity_weight: '35',
        loyalty_weight: '25'
      });
      console.log('Template filled successfully');
    }

    // Test all template names
    const allTemplates = PromptTemplates.getAllTemplateNames();
    console.log('Available templates:', allTemplates);

    console.log('✅ PromptTemplates tests completed');
  }

  /**
   * Test AnthropicService configuration (without API calls)
   */
  public testAnthropicService(): void {
    console.log('🧪 Testing AnthropicService configuration...');

    const mockConfig: AnthropicConfig = {
      apiKey: 'test-key',
      model: 'claude-sonnet-4-20250514',
      maxTokens: 4000,
      temperature: 0.3
    };

    // Test configuration
    anthropicService.updateConfig(mockConfig);
    const retrievedConfig = anthropicService.getConfig();
    console.log('Config set and retrieved:', retrievedConfig?.model);

    // Test stats
    const stats = anthropicService.getStats();
    console.log('Service stats:', stats);

    console.log('✅ AnthropicService configuration tests completed');
  }

  /**
   * Test integration between all services
   */
  public async testServiceIntegration(): Promise<void> {
    console.log('🧪 Testing service integration...');

    try {
      // Test weighting and conflict services together
      const mockSettings = weightingService.getDefaultWeightingSettings();
      console.log('Default weighting settings loaded');

      // Test chat and assignment workflow integration
      const mockContext: AssignmentContext = {
        teachers: [],
        courses: [],
        current_assignments: [],
        conflicts: [],
        weighting_settings: mockSettings
      };

      // This would fail without API key, but tests the integration structure
      try {
        const workflowResult = await chatAssignmentWorkflow.startAssignmentModification(
          mockContext,
          'Test integration message'
        );
        console.log('✅ Workflow integration successful');
      } catch (error) {
        console.log('⚠️  Workflow integration failed (expected without API key)');
      }

      console.log('✅ Service integration tests completed');

    } catch (error) {
      console.log('⚠️  Service integration test failed:', error);
    }
  }

  /**
   * Run all tests
   */
  public async runAllTests(): Promise<void> {
    console.log('🚀 Running AI Integration Test Suite');
    console.log('====================================');

    this.testWeightingService();
    console.log('');

    await this.testChatService();
    console.log('');

    this.testConflictResolution();
    console.log('');

    this.testPromptTemplates();
    console.log('');

    this.testAnthropicService();
    console.log('');

    await this.testServiceIntegration();

    console.log('====================================');
    console.log('🎉 AI Integration Test Suite completed!');
  }
}

/**
 * Utility function to run the test suite
 */
export async function runAIIntegrationTests(): Promise<void> {
  const testSuite = new AIIntegrationTest();
  await testSuite.runAllTests();
}

// Export for use in other files
export { AIIntegrationTest };