import { 
  Teacher, 
  Course, 
  Assignment, 
  AIAssignmentOptimizationRequest,
  AIOptimizationResponse,
  AssignmentWithWeighting,
  WeightingSettings,
  Conflict,
  ConflictType,
  ConflictSeverity,
  ChatSuggestion,
  AssignmentConstraints
} from '../types';
import { anthropicService } from './AnthropicService';
import { weightingService } from './WeightingService';

/**
 * AI-powered assignment optimization service
 * Combines qualification matching, weighting algorithms, and AI suggestions
 */
export class AIAssignmentService {
  
  /**
   * Generate optimal assignments using AI and weighting algorithms
   */
  public async optimizeAssignments(
    request: AIAssignmentOptimizationRequest
  ): Promise<AIOptimizationResponse> {
    try {
      // Step 1: Find all possible assignments based on exact qualification matching
      const possibleAssignments = this.findPossibleAssignments(request.teachers, request.courses);
      
      if (possibleAssignments.length === 0) {
        return this.createNoAssignmentsResponse();
      }

      // Step 2: Calculate weighted scores for each possible assignment
      const scoredAssignments = await this.scoreAssignments(
        possibleAssignments, 
        request.teachers,
        request.existing_assignments || [],
        request.weighting_settings
      );

      // Step 3: Detect conflicts
      const conflicts = this.detectConflicts(scoredAssignments, request.existing_assignments || []);

      // Step 4: Use AI to optimize and provide alternatives
      const aiResponse = await anthropicService.optimizeAssignments(request);

      // Step 5: Validate and enhance AI suggestions
      const validatedAssignments = this.validateAIAssignments(
        aiResponse.optimized_assignments,
        request.teachers,
        request.courses
      );

      return {
        optimized_assignments: validatedAssignments,
        rationale: aiResponse.rationale,
        alternatives: aiResponse.alternatives || [],
        conflicts_resolved: conflicts.filter(c => c.severity !== 'critical'),
        suggestions: aiResponse.suggestions || []
      };

    } catch (error) {
      console.error('AI assignment optimization failed:', error);
      return this.createFallbackResponse(request, error);
    }
  }

  /**
   * Generate conflict resolution suggestions
   */
  public async generateConflictResolution(
    conflicts: Conflict[],
    context: {
      teachers: Teacher[];
      courses: Course[];
      assignments: Assignment[];
      weightingSettings: WeightingSettings;
    }
  ): Promise<ChatSuggestion[]> {
    const systemPrompt = `You are an assignment conflict resolution specialist. Analyze conflicts and provide practical solutions.

CONFLICT RESOLUTION STRATEGIES:
1. Reassign teachers to different courses (only where qualifications match exactly)
2. Adjust time slots to avoid overlaps
3. Modify weighting settings to prioritize different factors
4. Suggest additional resources or teachers

RESPONSE FORMAT:
Return JSON array of suggestions: [{"type": "reassign|reschedule|modify_weights|add_resource", "description": "clear action", "action_data": {...}, "confidence": 0.8}]`;

    const userPrompt = `Resolve these assignment conflicts:

CONFLICTS:
${conflicts.map(c => `- ${c.type}: ${c.description} (${c.severity})`).join('\n')}

CONTEXT:
Teachers: ${context.teachers.map(t => `${t.name} (${t.qualifications.join(', ')})`).join(', ')}
Courses: ${context.courses.map(c => `${c.topic}`).join(', ')}
Current Assignments: ${context.assignments.length}
Weighting: Equality ${context.weightingSettings.equality_weight}%, Continuity ${context.weightingSettings.continuity_weight}%, Loyalty ${context.weightingSettings.loyalty_weight}%

Provide practical conflict resolution suggestions.`;

    try {
      const response = await anthropicService.sendMessage(userPrompt, systemPrompt);
      return JSON.parse(response.content);
    } catch (error) {
      console.error('Failed to generate conflict resolution:', error);
      return this.createFallbackConflictSuggestions(conflicts);
    }
  }

  /**
   * Balance workload across teachers using AI recommendations
   */
  public async balanceWorkload(
    teachers: Teacher[],
    assignments: Assignment[],
    weightingSettings: WeightingSettings
  ): Promise<{ 
    balanced_assignments: Assignment[]; 
    workload_analysis: Record<number, { current: number; recommended: number; }>;
    suggestions: ChatSuggestion[];
  }> {
    // Calculate current workload distribution
    const workloadMap = this.calculateWorkloadDistribution(teachers, assignments);
    const avgWorkload = Object.values(workloadMap).reduce((sum, w) => sum + w, 0) / teachers.length;
    
    const systemPrompt = `You are a workload balancing specialist. Analyze current teacher assignments and suggest optimal distribution.

BALANCING PRINCIPLES:
- Aim for equal distribution across qualified teachers
- Consider teacher availability and preferences
- Maintain continuity where possible
- Only suggest assignments where qualifications match exactly

RESPONSE FORMAT:
{
  "workload_analysis": {teacher_id: {"current": X, "recommended": Y}},
  "suggestions": [{"type": "reassign", "description": "move assignment", "action_data": {...}, "confidence": 0.9}]
}`;

    const userPrompt = `Balance workload for these teachers:

CURRENT WORKLOAD:
${teachers.map(t => `Teacher ${t.id} (${t.name}): ${workloadMap[t.id] || 0} assignments - Qualifications: ${t.qualifications.join(', ')}`).join('\n')}

AVERAGE WORKLOAD: ${avgWorkload.toFixed(1)} assignments per teacher

WEIGHTING SETTINGS:
- Equality Weight: ${weightingSettings.equality_weight}%
- Continuity Weight: ${weightingSettings.continuity_weight}%
- Loyalty Weight: ${weightingSettings.loyalty_weight}%

Suggest how to balance workload while maintaining assignment quality.`;

    try {
      const response = await anthropicService.sendMessage(userPrompt, systemPrompt);
      const result = JSON.parse(response.content);
      
      return {
        balanced_assignments: assignments, // Would need actual rebalancing logic
        workload_analysis: result.workload_analysis || {},
        suggestions: result.suggestions || []
      };
    } catch (error) {
      console.error('Failed to balance workload:', error);
      return {
        balanced_assignments: assignments,
        workload_analysis: Object.fromEntries(teachers.map(t => [t.id, { current: workloadMap[t.id] || 0, recommended: Math.round(avgWorkload) }])),
        suggestions: []
      };
    }
  }

  /**
   * Generate assignment rationale using AI
   */
  public async generateAssignmentRationale(
    assignment: AssignmentWithWeighting,
    context: {
      allTeachers: Teacher[];
      alternatives?: AssignmentWithWeighting[];
      conflicts?: Conflict[];
    }
  ): Promise<string> {
    try {
      const reasons = [
        `Qualification match: ${assignment.teacher.qualifications.includes(assignment.course.topic) ? 'Exact' : 'Partial'}`,
        `Equality score: ${(assignment.weighting_score.equality_score * 100).toFixed(1)}%`,
        `Continuity score: ${(assignment.weighting_score.continuity_score * 100).toFixed(1)}%`,
        `Loyalty score: ${(assignment.weighting_score.loyalty_score * 100).toFixed(1)}%`,
        `Final weighted score: ${(assignment.weighting_score.final_score * 100).toFixed(1)}%`
      ];

      return await anthropicService.generateAssignmentRationale(
        assignment.teacher.name,
        assignment.course.topic,
        reasons
      );
    } catch (error) {
      console.error('Failed to generate rationale:', error);
      return this.createFallbackRationale(assignment);
    }
  }

  /**
   * Find all possible assignments based on exact qualification matching
   */
  private findPossibleAssignments(teachers: Teacher[], courses: Course[]): { teacher: Teacher; course: Course }[] {
    const possibleAssignments: { teacher: Teacher; course: Course }[] = [];

    for (const teacher of teachers) {
      for (const course of courses) {
        // Only exact qualification matches allowed
        if (teacher.qualifications.includes(course.topic)) {
          possibleAssignments.push({ teacher, course });
        }
      }
    }

    return possibleAssignments;
  }

  /**
   * Score all possible assignments using weighting algorithm
   */
  private async scoreAssignments(
    possibleAssignments: { teacher: Teacher; course: Course }[],
    allTeachers: Teacher[],
    existingAssignments: Assignment[],
    weightingSettings: WeightingSettings
  ): Promise<AssignmentWithWeighting[]> {
    const scoredAssignments: AssignmentWithWeighting[] = [];

    for (const { teacher, course } of possibleAssignments) {
      // Create temporary assignment for scoring
      const tempAssignment: Assignment = {
        id: 0, // Temporary ID
        teacher_id: teacher.id,
        course_id: course.id,
        scheduled_slots: [], // Will be populated later
        status: 'pending',
        created_at: new Date().toISOString()
      };

      const assignmentWithWeighting = weightingService.createAssignmentWithWeighting(
        tempAssignment,
        teacher,
        course,
        0, // Base score, will be calculated
        [], // No conflicts initially
        existingAssignments,
        allTeachers,
        weightingSettings
      );

      scoredAssignments.push(assignmentWithWeighting);
    }

    // Sort by weighted score (highest first)
    return scoredAssignments.sort(weightingService.compareAssignments);
  }

  /**
   * Detect scheduling and workload conflicts
   */
  private detectConflicts(
    assignments: AssignmentWithWeighting[],
    existingAssignments: Assignment[]
  ): Conflict[] {
    const conflicts: Conflict[] = [];

    // Check for workload imbalance
    const teacherWorkload = new Map<number, number>();
    [...assignments, ...existingAssignments].forEach(a => {
      const teacherId = 'teacher_id' in a ? a.teacher_id : a.assignment.teacher_id;
      teacherWorkload.set(teacherId, (teacherWorkload.get(teacherId) || 0) + 1);
    });

    const workloads = Array.from(teacherWorkload.values());
    const maxWorkload = Math.max(...workloads);
    const minWorkload = Math.min(...workloads);

    if (maxWorkload - minWorkload > 2) {
      conflicts.push({
        type: 'workload_exceeded',
        description: `Workload imbalance detected: max ${maxWorkload}, min ${minWorkload}`,
        severity: 'medium',
        affected_assignments: []
      });
    }

    // Check for qualification mismatches (shouldn't happen with our algorithm)
    assignments.forEach(a => {
      if (!a.teacher.qualifications.includes(a.course.topic)) {
        conflicts.push({
          type: 'qualification_mismatch',
          description: `${a.teacher.name} not qualified for ${a.course.topic}`,
          severity: 'critical',
          affected_assignments: [a.assignment.id]
        });
      }
    });

    return conflicts;
  }

  /**
   * Validate AI-generated assignments
   */
  private validateAIAssignments(
    aiAssignments: AssignmentWithWeighting[],
    teachers: Teacher[],
    courses: Course[]
  ): AssignmentWithWeighting[] {
    return aiAssignments.filter(assignment => {
      const teacher = teachers.find(t => t.id === assignment.teacher.id);
      const course = courses.find(c => c.id === assignment.course.id);
      
      // Ensure exact qualification match
      return teacher && 
             course && 
             teacher.qualifications.includes(course.topic);
    });
  }

  /**
   * Calculate workload distribution across teachers
   */
  private calculateWorkloadDistribution(
    teachers: Teacher[],
    assignments: Assignment[]
  ): Record<number, number> {
    const workloadMap: Record<number, number> = {};
    
    // Initialize with 0 for all teachers
    teachers.forEach(t => workloadMap[t.id] = 0);
    
    // Count assignments per teacher
    assignments.forEach(a => {
      if (a.status === 'active' || a.status === 'pending') {
        workloadMap[a.teacher_id] = (workloadMap[a.teacher_id] || 0) + 1;
      }
    });

    return workloadMap;
  }

  /**
   * Create response when no assignments are possible
   */
  private createNoAssignmentsResponse(): AIOptimizationResponse {
    return {
      optimized_assignments: [],
      rationale: 'No valid assignments found. Please check that teachers have qualifications matching the course topics exactly.',
      alternatives: [],
      conflicts_resolved: [],
      suggestions: [
        {
          type: 'add_teacher',
          description: 'Consider hiring teachers with qualifications matching the required course topics',
          action_data: { reason: 'qualification_gap' },
          confidence: 0.9
        }
      ]
    };
  }

  /**
   * Create fallback response when AI optimization fails
   */
  private createFallbackResponse(
    request: AIAssignmentOptimizationRequest,
    error: any
  ): AIOptimizationResponse {
    // Use basic matching algorithm as fallback
    const possibleAssignments = this.findPossibleAssignments(request.teachers, request.courses);
    
    const basicAssignments: AssignmentWithWeighting[] = possibleAssignments.slice(0, request.courses.length).map((pa, index) => {
      const tempAssignment: Assignment = {
        id: index + 1000, // Temporary ID
        teacher_id: pa.teacher.id,
        course_id: pa.course.id,
        scheduled_slots: [],
        status: 'pending',
        created_at: new Date().toISOString()
      };

      return weightingService.createAssignmentWithWeighting(
        tempAssignment,
        pa.teacher,
        pa.course,
        0.5, // Basic score
        [],
        request.existing_assignments || [],
        request.teachers,
        request.weighting_settings
      );
    });

    return {
      optimized_assignments: basicAssignments,
      rationale: `AI optimization temporarily unavailable (${error.message}). Using basic qualification matching.`,
      alternatives: [],
      conflicts_resolved: [],
      suggestions: []
    };
  }

  /**
   * Create fallback conflict suggestions
   */
  private createFallbackConflictSuggestions(conflicts: Conflict[]): ChatSuggestion[] {
    return conflicts.map(conflict => ({
      type: 'resolve_conflict',
      description: `Review and manually resolve: ${conflict.description}`,
      action_data: { conflict_id: conflict.type },
      confidence: 0.5
    }));
  }

  /**
   * Create fallback rationale
   */
  private createFallbackRationale(assignment: AssignmentWithWeighting): string {
    return `${assignment.teacher.name} assigned to ${assignment.course.topic} based on exact qualification match. Weighted score: ${(assignment.weighting_score.final_score * 100).toFixed(1)}%.`;
  }
}

// Export singleton instance
export const aiAssignmentService = new AIAssignmentService();