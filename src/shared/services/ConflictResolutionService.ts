import {
  Conflict,
  ConflictType,
  ConflictSeverity,
  Assignment,
  Teacher,
  Course,
  ChatSuggestion,
  TimeSlot,
  WeightingSettings
} from '../types';
import { anthropicService } from './AnthropicService';

/**
 * Service for detecting and resolving assignment conflicts
 * Handles scheduling conflicts, workload imbalances, and qualification mismatches
 */
export class ConflictResolutionService {

  /**
   * Comprehensive conflict detection across all assignments
   */
  public detectAllConflicts(
    assignments: Assignment[],
    teachers: Teacher[],
    courses: Course[]
  ): Conflict[] {
    const conflicts: Conflict[] = [];

    // Detect different types of conflicts
    conflicts.push(...this.detectTimeConflicts(assignments));
    conflicts.push(...this.detectWorkloadConflicts(assignments, teachers));
    conflicts.push(...this.detectQualificationConflicts(assignments, teachers, courses));
    conflicts.push(...this.detectAvailabilityConflicts(assignments, teachers));

    return conflicts.sort((a, b) => this.getSeverityWeight(b.severity) - this.getSeverityWeight(a.severity));
  }

  /**
   * Detect time overlapping conflicts between assignments
   */
  public detectTimeConflicts(assignments: Assignment[]): Conflict[] {
    const conflicts: Conflict[] = [];
    const activeAssignments = assignments.filter(a => a.status === 'active' || a.status === 'pending');

    for (let i = 0; i < activeAssignments.length; i++) {
      for (let j = i + 1; j < activeAssignments.length; j++) {
        const assignment1 = activeAssignments[i];
        const assignment2 = activeAssignments[j];

        // Skip if same teacher (teacher can't be in two places at once)
        if (assignment1.teacher_id === assignment2.teacher_id) {
          const overlaps = this.findTimeSlotOverlaps(
            assignment1.scheduled_slots || [],
            assignment2.scheduled_slots || []
          );

          if (overlaps.length > 0) {
            conflicts.push({
              type: 'time_overlap',
              description: `Teacher ${assignment1.teacher_id} has overlapping time slots between assignments ${assignment1.id} and ${assignment2.id}`,
              severity: 'high',
              affected_assignments: [assignment1.id, assignment2.id]
            });
          }
        }
      }
    }

    return conflicts;
  }

  /**
   * Detect workload imbalance conflicts
   */
  public detectWorkloadConflicts(assignments: Assignment[], teachers: Teacher[]): Conflict[] {
    const conflicts: Conflict[] = [];
    
    // Calculate workload per teacher
    const workloadMap = new Map<number, number>();
    teachers.forEach(t => workloadMap.set(t.id, 0));
    
    assignments
      .filter(a => a.status === 'active' || a.status === 'pending')
      .forEach(a => {
        workloadMap.set(a.teacher_id, (workloadMap.get(a.teacher_id) || 0) + 1);
      });

    const workloads = Array.from(workloadMap.values());
    const avgWorkload = workloads.reduce((sum, w) => sum + w, 0) / teachers.length;
    const maxWorkload = Math.max(...workloads);
    const minWorkload = Math.min(...workloads);

    // Detect severe imbalances
    if (maxWorkload - minWorkload > 3) {
      const overloadedTeachers = teachers.filter(t => 
        (workloadMap.get(t.id) || 0) > avgWorkload + 2
      );

      const underloadedTeachers = teachers.filter(t => 
        (workloadMap.get(t.id) || 0) < avgWorkload - 1
      );

      conflicts.push({
        type: 'workload_exceeded',
        description: `Severe workload imbalance: ${overloadedTeachers.length} overloaded teachers, ${underloadedTeachers.length} underloaded teachers`,
        severity: maxWorkload - minWorkload > 5 ? 'critical' : 'high',
        affected_assignments: assignments
          .filter(a => overloadedTeachers.some(t => t.id === a.teacher_id))
          .map(a => a.id)
      });
    }

    return conflicts;
  }

  /**
   * Detect qualification mismatch conflicts
   */
  public detectQualificationConflicts(
    assignments: Assignment[],
    teachers: Teacher[],
    courses: Course[]
  ): Conflict[] {
    const conflicts: Conflict[] = [];

    assignments.forEach(assignment => {
      const teacher = teachers.find(t => t.id === assignment.teacher_id);
      const course = courses.find(c => c.id === assignment.course_id);

      if (teacher && course) {
        // Check for exact qualification match
        if (!teacher.qualifications.includes(course.topic)) {
          conflicts.push({
            type: 'qualification_mismatch',
            description: `${teacher.name} lacks exact qualification for ${course.topic}. Teacher qualifications: ${teacher.qualifications.join(', ')}`,
            severity: 'critical',
            affected_assignments: [assignment.id]
          });
        }
      }
    });

    return conflicts;
  }

  /**
   * Detect teacher availability conflicts
   */
  public detectAvailabilityConflicts(assignments: Assignment[], teachers: Teacher[]): Conflict[] {
    const conflicts: Conflict[] = [];

    assignments.forEach(assignment => {
      const teacher = teachers.find(t => t.id === assignment.teacher_id);
      
      if (teacher && assignment.scheduled_slots) {
        assignment.scheduled_slots.forEach(slot => {
          if (!this.isTeacherAvailable(teacher, slot)) {
            conflicts.push({
              type: 'availability_conflict',
              description: `${teacher.name} not available during ${slot.date} ${slot.start_time}-${slot.end_time}`,
              severity: 'medium',
              affected_assignments: [assignment.id]
            });
          }
        });
      }
    });

    return conflicts;
  }

  /**
   * Generate AI-powered conflict resolution suggestions
   */
  public async generateResolutionSuggestions(
    conflicts: Conflict[],
    context: {
      assignments: Assignment[];
      teachers: Teacher[];
      courses: Course[];
      weightingSettings: WeightingSettings;
    }
  ): Promise<ChatSuggestion[]> {
    if (conflicts.length === 0) {
      return [];
    }

    const systemPrompt = `You are an expert assignment conflict resolver. Analyze conflicts and provide actionable solutions.

RESOLUTION STRATEGIES:
1. REASSIGN: Move teacher to different course (only where qualified)
2. RESCHEDULE: Change time slots to avoid overlaps
3. BALANCE: Redistribute assignments for better workload equality
4. QUALIFY: Suggest teacher training or hiring for missing qualifications

CRITICAL RULES:
- Never suggest assignments where teacher qualifications don't EXACTLY match course topic
- Prioritize critical conflicts over lower severity ones
- Consider current weighting settings in suggestions

RESPONSE FORMAT:
Return JSON array: [{"type": "reassign|reschedule|balance|qualify", "description": "specific action", "action_data": {...}, "confidence": 0.8}]`;

    const conflictSummary = conflicts.map(c => 
      `${c.type.toUpperCase()} (${c.severity}): ${c.description}`
    ).join('\n');

    const teacherSummary = context.teachers.map(t => 
      `${t.name} (ID: ${t.id}): ${t.qualifications.join(', ')}`
    ).join('\n');

    const courseSummary = context.courses.map(c => 
      `${c.topic} (ID: ${c.id}): ${c.lessons_count} lessons`
    ).join('\n');

    const userPrompt = `Resolve these assignment conflicts:

CONFLICTS:
${conflictSummary}

TEACHERS:
${teacherSummary}

COURSES:
${courseSummary}

WEIGHTING SETTINGS: ${context.weightingSettings.profile_name}
- Equality: ${context.weightingSettings.equality_weight}%
- Continuity: ${context.weightingSettings.continuity_weight}%
- Loyalty: ${context.weightingSettings.loyalty_weight}%

Provide practical, implementable solutions prioritizing critical conflicts.`;

    try {
      const response = await anthropicService.sendMessage(userPrompt, systemPrompt);
      return JSON.parse(response.content);
    } catch (error) {
      console.error('Failed to generate AI conflict resolution:', error);
      return this.generateFallbackSuggestions(conflicts);
    }
  }

  /**
   * Resolve conflicts automatically where possible
   */
  public async autoResolveConflicts(
    conflicts: Conflict[],
    context: {
      assignments: Assignment[];
      teachers: Teacher[];
      courses: Course[];
    }
  ): Promise<{
    resolved: Conflict[];
    remaining: Conflict[];
    actions_taken: string[];
  }> {
    const resolved: Conflict[] = [];
    const remaining: Conflict[] = [];
    const actions: string[] = [];

    for (const conflict of conflicts) {
      switch (conflict.type) {
        case 'qualification_mismatch':
          // Cannot auto-resolve - requires human decision
          remaining.push(conflict);
          break;

        case 'time_overlap':
          // Try to reschedule if possible
          const rescheduleResult = await this.attemptTimeReschedule(conflict, context);
          if (rescheduleResult.success) {
            resolved.push(conflict);
            actions.push(rescheduleResult.action);
          } else {
            remaining.push(conflict);
          }
          break;

        case 'workload_exceeded':
          // Try basic workload rebalancing
          const balanceResult = await this.attemptWorkloadRebalance(conflict, context);
          if (balanceResult.success) {
            resolved.push(conflict);
            actions.push(balanceResult.action);
          } else {
            remaining.push(conflict);
          }
          break;

        case 'availability_conflict':
          // Mark for manual review
          remaining.push(conflict);
          actions.push(`Flagged availability conflict for manual review: ${conflict.description}`);
          break;

        default:
          remaining.push(conflict);
      }
    }

    return { resolved, remaining, actions_taken: actions };
  }

  /**
   * Calculate conflict severity score for prioritization
   */
  public calculateConflictSeverity(conflicts: Conflict[]): {
    total_score: number;
    critical_count: number;
    high_count: number;
    medium_count: number;
    low_count: number;
  } {
    let total_score = 0;
    let critical_count = 0;
    let high_count = 0;
    let medium_count = 0;
    let low_count = 0;

    conflicts.forEach(conflict => {
      const weight = this.getSeverityWeight(conflict.severity);
      total_score += weight;

      switch (conflict.severity) {
        case 'critical': critical_count++; break;
        case 'high': high_count++; break;
        case 'medium': medium_count++; break;
        case 'low': low_count++; break;
      }
    });

    return { total_score, critical_count, high_count, medium_count, low_count };
  }

  /**
   * Find overlapping time slots between two sets of time slots
   */
  private findTimeSlotOverlaps(slots1: TimeSlot[], slots2: TimeSlot[]): TimeSlot[] {
    const overlaps: TimeSlot[] = [];

    slots1.forEach(slot1 => {
      slots2.forEach(slot2 => {
        if (slot1.date === slot2.date) {
          // Check if times overlap
          const start1 = slot1.start_time;
          const end1 = slot1.end_time;
          const start2 = slot2.start_time;
          const end2 = slot2.end_time;

          if (start1 < end2 && start2 < end1) {
            overlaps.push(slot1);
          }
        }
      });
    });

    return overlaps;
  }

  /**
   * Check if teacher is available during a time slot
   */
  private isTeacherAvailable(teacher: Teacher, slot: TimeSlot): boolean {
    if (!teacher.working_times) {
      return true; // Assume available if no working times specified
    }

    const date = new Date(slot.date);
    const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    const dayOfWeek = dayNames[date.getDay()] as keyof typeof teacher.working_times;
    const workingTime = teacher.working_times[dayOfWeek];

    if (!workingTime) {
      return false; // Not working this day
    }

    return slot.start_time >= workingTime.start && slot.end_time <= workingTime.end;
  }

  /**
   * Get numeric weight for conflict severity
   */
  private getSeverityWeight(severity: ConflictSeverity): number {
    switch (severity) {
      case 'critical': return 10;
      case 'high': return 7;
      case 'medium': return 4;
      case 'low': return 1;
      default: return 0;
    }
  }

  /**
   * Generate fallback suggestions when AI fails
   */
  private generateFallbackSuggestions(conflicts: Conflict[]): ChatSuggestion[] {
    return conflicts.slice(0, 3).map(conflict => ({
      type: 'resolve_conflict',
      description: `Manually review and resolve: ${conflict.description}`,
      action_data: { 
        conflict_type: conflict.type,
        affected_assignments: conflict.affected_assignments 
      },
      confidence: 0.6
    }));
  }

  /**
   * Attempt automatic time rescheduling
   */
  private async attemptTimeReschedule(
    conflict: Conflict,
    context: { assignments: Assignment[]; teachers: Teacher[]; courses: Course[] }
  ): Promise<{ success: boolean; action: string }> {
    // This is a placeholder - would need actual scheduling logic
    return {
      success: false,
      action: `Time rescheduling attempted for conflict: ${conflict.description}`
    };
  }

  /**
   * Attempt automatic workload rebalancing
   */
  private async attemptWorkloadRebalance(
    conflict: Conflict,
    context: { assignments: Assignment[]; teachers: Teacher[]; courses: Course[] }
  ): Promise<{ success: boolean; action: string }> {
    // This is a placeholder - would need actual rebalancing logic
    return {
      success: false,
      action: `Workload rebalancing attempted for conflict: ${conflict.description}`
    };
  }
}

// Export singleton instance
export const conflictResolutionService = new ConflictResolutionService();