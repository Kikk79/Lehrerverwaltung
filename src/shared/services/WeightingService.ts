import { 
  WeightingSettings, 
  WeightingScore, 
  Assignment, 
  Teacher, 
  Course, 
  AssignmentWithWeighting,
  TimeSlot 
} from '../types';

/**
 * Service for calculating weighted scores for teacher assignments
 * Implements three weighting factors: Equality, Continuity, and Loyalty
 */
export class WeightingService {
  
  /**
   * Calculate weighted score for an assignment
   */
  public calculateWeightedScore(
    assignment: Assignment,
    teacher: Teacher,
    course: Course,
    allAssignments: Assignment[],
    allTeachers: Teacher[],
    weightingSettings: WeightingSettings
  ): WeightingScore {
    const equalityScore = this.calculateEqualityScore(teacher, allAssignments, allTeachers);
    const continuityScore = this.calculateContinuityScore(assignment);
    const loyaltyScore = this.calculateLoyaltyScore(assignment, teacher, course, allAssignments);

    // Convert weights from 0-100 to 0-1
    const equalityWeight = weightingSettings.equality_weight / 100;
    const continuityWeight = weightingSettings.continuity_weight / 100;
    const loyaltyWeight = weightingSettings.loyalty_weight / 100;

    // Calculate final weighted score
    const finalScore = (
      equalityScore * equalityWeight + 
      continuityScore * continuityWeight + 
      loyaltyScore * loyaltyWeight
    );

    return {
      equality_score: equalityScore,
      continuity_score: continuityScore,
      loyalty_score: loyaltyScore,
      final_score: finalScore
    };
  }

  /**
   * Calculate equality score based on workload distribution
   * Higher score means more equal distribution across teachers
   */
  private calculateEqualityScore(
    teacher: Teacher,
    allAssignments: Assignment[],
    allTeachers: Teacher[]
  ): number {
    // Count current assignments for each teacher
    const teacherWorkload = new Map<number, number>();
    
    // Initialize with 0 for all teachers
    allTeachers.forEach(t => teacherWorkload.set(t.id, 0));
    
    // Count existing assignments
    allAssignments.forEach(assignment => {
      const current = teacherWorkload.get(assignment.teacher_id) || 0;
      teacherWorkload.set(assignment.teacher_id, current + 1);
    });

    // Calculate workload statistics
    const workloads = Array.from(teacherWorkload.values());
    const maxWorkload = Math.max(...workloads);
    const minWorkload = Math.min(...workloads);
    const avgWorkload = workloads.reduce((sum, w) => sum + w, 0) / workloads.length;
    
    const currentTeacherWorkload = teacherWorkload.get(teacher.id) || 0;

    // If all teachers have the same workload, perfect equality
    if (maxWorkload === minWorkload) {
      return 1.0;
    }

    // Calculate how adding this assignment affects equality
    const proposedWorkload = currentTeacherWorkload + 1;
    
    // Score higher if this teacher is below average
    if (currentTeacherWorkload < avgWorkload) {
      // Reward assigning to underloaded teacher
      const underloadFactor = (avgWorkload - currentTeacherWorkload) / (maxWorkload - minWorkload);
      return Math.min(1.0, 0.5 + underloadFactor);
    } else if (currentTeacherWorkload > avgWorkload) {
      // Penalize assigning to overloaded teacher
      const overloadFactor = (currentTeacherWorkload - avgWorkload) / (maxWorkload - minWorkload);
      return Math.max(0.0, 0.5 - overloadFactor);
    }

    // At average, neutral score
    return 0.5;
  }

  /**
   * Calculate continuity score based on lesson scheduling
   * Higher score for consecutive time blocks, lower for scattered lessons
   */
  private calculateContinuityScore(assignment: Assignment): number {
    if (!assignment.scheduled_slots || assignment.scheduled_slots.length === 0) {
      return 0.5; // Neutral score for unscheduled assignments
    }

    const slots = assignment.scheduled_slots;
    
    // Single lesson gets neutral score
    if (slots.length === 1) {
      return 0.5;
    }

    // Group slots by date
    const slotsByDate = new Map<string, TimeSlot[]>();
    slots.forEach(slot => {
      if (!slotsByDate.has(slot.date)) {
        slotsByDate.set(slot.date, []);
      }
      slotsByDate.get(slot.date)!.push(slot);
    });

    let totalContinuityScore = 0;
    let totalSlots = 0;

    // Calculate continuity for each day
    slotsByDate.forEach(daySlots => {
      const sortedSlots = daySlots.sort((a, b) => a.start_time.localeCompare(b.start_time));
      
      if (sortedSlots.length === 1) {
        totalContinuityScore += 0.5;
        totalSlots += 1;
        return;
      }

      // Check for consecutive time slots
      let consecutiveBlocks = 0;
      let currentBlockSize = 1;

      for (let i = 1; i < sortedSlots.length; i++) {
        const prevSlot = sortedSlots[i - 1];
        const currentSlot = sortedSlots[i];

        // Check if slots are consecutive (end time of previous = start time of current)
        if (prevSlot.end_time === currentSlot.start_time) {
          currentBlockSize++;
        } else {
          // End of consecutive block
          if (currentBlockSize > 1) {
            consecutiveBlocks += currentBlockSize;
          }
          currentBlockSize = 1;
        }
      }

      // Don't forget the last block
      if (currentBlockSize > 1) {
        consecutiveBlocks += currentBlockSize;
      }

      // Score based on percentage of lessons in consecutive blocks
      const continuityRatio = consecutiveBlocks / sortedSlots.length;
      totalContinuityScore += continuityRatio;
      totalSlots += 1;
    });

    return totalSlots > 0 ? totalContinuityScore / totalSlots : 0.5;
  }

  /**
   * Calculate loyalty score based on teacher-course consistency
   * Higher score if teacher has taught this course before
   */
  private calculateLoyaltyScore(
    assignment: Assignment,
    teacher: Teacher,
    course: Course,
    allAssignments: Assignment[]
  ): number {
    // Check if teacher has been assigned to this course before
    const hasHistoryWithCourse = allAssignments.some(a => 
      a.teacher_id === teacher.id && 
      a.course_id === course.id && 
      a.id !== assignment.id &&
      a.status !== 'cancelled'
    );

    if (hasHistoryWithCourse) {
      return 1.0; // Maximum loyalty score for existing relationship
    }

    // Check if teacher has taught similar topics (matching qualifications)
    const teacherQualifications = new Set(teacher.qualifications);
    if (teacherQualifications.has(course.topic)) {
      return 0.7; // High score for qualified teacher
    }

    // Check for partial qualification matches (not used in assignment but for scoring)
    const partialMatches = teacher.qualifications.filter(qual => 
      qual.toLowerCase().includes(course.topic.toLowerCase()) ||
      course.topic.toLowerCase().includes(qual.toLowerCase())
    ).length;

    if (partialMatches > 0) {
      return 0.4; // Some loyalty for related qualifications
    }

    return 0.1; // Low score for no history or qualification match
  }

  /**
   * Create assignment with weighting information
   */
  public createAssignmentWithWeighting(
    assignment: Assignment,
    teacher: Teacher,
    course: Course,
    score: number,
    conflicts: any[],
    allAssignments: Assignment[],
    allTeachers: Teacher[],
    weightingSettings: WeightingSettings
  ): AssignmentWithWeighting {
    const weightingScore = this.calculateWeightedScore(
      assignment, 
      teacher, 
      course, 
      allAssignments, 
      allTeachers, 
      weightingSettings
    );

    return {
      teacher,
      course,
      assignment,
      conflicts,
      score,
      weighting_score: weightingScore
    };
  }

  /**
   * Get default weighting settings
   */
  public getDefaultWeightingSettings(): WeightingSettings {
    return {
      profile_name: 'Balanced',
      equality_weight: 33,
      continuity_weight: 33,
      loyalty_weight: 34,
      is_default: true
    };
  }

  /**
   * Get emergency weighting settings (reduce loyalty for crisis situations)
   */
  public getEmergencyWeightingSettings(): WeightingSettings {
    return {
      profile_name: 'Emergency',
      equality_weight: 60,
      continuity_weight: 40,
      loyalty_weight: 0, // Override loyalty in emergency
      is_default: false
    };
  }

  /**
   * Get continuity-focused weighting settings
   */
  public getContinuityWeightingSettings(): WeightingSettings {
    return {
      profile_name: 'Continuity Focus',
      equality_weight: 25,
      continuity_weight: 60,
      loyalty_weight: 15,
      is_default: false
    };
  }

  /**
   * Validate weighting settings
   */
  public validateWeightingSettings(settings: WeightingSettings): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (settings.equality_weight < 0 || settings.equality_weight > 100) {
      errors.push('Equality weight must be between 0 and 100');
    }

    if (settings.continuity_weight < 0 || settings.continuity_weight > 100) {
      errors.push('Continuity weight must be between 0 and 100');
    }

    if (settings.loyalty_weight < 0 || settings.loyalty_weight > 100) {
      errors.push('Loyalty weight must be between 0 and 100');
    }

    const totalWeight = settings.equality_weight + settings.continuity_weight + settings.loyalty_weight;
    if (Math.abs(totalWeight - 100) > 0.1) {
      errors.push(`Total weights must equal 100, got ${totalWeight}`);
    }

    if (!settings.profile_name || settings.profile_name.trim().length === 0) {
      errors.push('Profile name is required');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * Compare two assignments based on weighted scores
   */
  public compareAssignments(
    a: AssignmentWithWeighting, 
    b: AssignmentWithWeighting
  ): number {
    return b.weighting_score.final_score - a.weighting_score.final_score;
  }

  /**
   * Get human-readable explanation of weighting factors
   */
  public getWeightingExplanation(score: WeightingScore, settings: WeightingSettings): string {
    const explanations: string[] = [];

    if (settings.equality_weight > 0) {
      explanations.push(`Equality (${settings.equality_weight}%): ${(score.equality_score * 100).toFixed(1)}% - workload distribution`);
    }

    if (settings.continuity_weight > 0) {
      explanations.push(`Continuity (${settings.continuity_weight}%): ${(score.continuity_score * 100).toFixed(1)}% - lesson scheduling`);
    }

    if (settings.loyalty_weight > 0) {
      explanations.push(`Loyalty (${settings.loyalty_weight}%): ${(score.loyalty_score * 100).toFixed(1)}% - teacher-course history`);
    }

    const finalScore = (score.final_score * 100).toFixed(1);
    explanations.push(`Final Score: ${finalScore}%`);

    return explanations.join(' | ');
  }
}

// Export singleton instance
export const weightingService = new WeightingService();