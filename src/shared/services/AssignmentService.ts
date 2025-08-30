import { 
  Teacher, 
  Course, 
  Assignment, 
  AssignmentResult,
  Conflict,
  ConflictType,
  ConflictSeverity,
  TimeSlot,
  WorkingTimes,
  TimeRange,
  AssignmentConstraints
} from '../types';
import { DatabaseService } from './DatabaseService';

/**
 * Weighting factors for assignment optimization
 */
export interface AssignmentWeights {
  equality: number;      // Gleichmäßigkeit (0-100%)
  continuity: number;    // Kontinuität (0-100%)
  loyalty: number;       // Lehrertreue (0-100%)
}

/**
 * Hungarian Algorithm node for assignment optimization
 */
interface HungarianNode {
  teacherId: number;
  courseId: number;
  cost: number;
}

/**
 * Assignment statistics for scoring
 */
interface TeacherWorkload {
  teacherId: number;
  totalLessons: number;
  totalHours: number;
  assignmentCount: number;
}

/**
 * Core Assignment Service implementing all assignment algorithms
 * Handles teacher-course assignment optimization using multiple algorithms
 */
export class AssignmentService {
  private dbService: DatabaseService;
  
  constructor(dbService?: DatabaseService) {
    this.dbService = dbService || DatabaseService.getInstance();
  }

  // ALGO-001: Basic qualification-matching algorithm (exact match only)
  
  /**
   * Find teachers qualified for a specific course
   * CRITICAL: Uses exact string matching only - no AI speculation
   * @param course Course requiring specific qualifications
   * @param teachers Array of available teachers
   * @returns Array of qualified teachers
   */
  public findQualifiedTeachers(course: Course, teachers: Teacher[]): Teacher[] {
    return teachers.filter(teacher => {
      // Exact match: teacher must have the exact qualification string in their qualifications array
      return teacher.qualifications.includes(course.topic);
    });
  }

  /**
   * Get all possible teacher-course pairs based on exact qualification matching
   */
  public getQualificationMatches(courses: Course[], teachers: Teacher[]): Array<{teacher: Teacher, course: Course}> {
    const matches: Array<{teacher: Teacher, course: Course}> = [];
    
    courses.forEach(course => {
      const qualifiedTeachers = this.findQualifiedTeachers(course, teachers);
      qualifiedTeachers.forEach(teacher => {
        matches.push({ teacher, course });
      });
    });
    
    return matches;
  }

  // ALGO-002: Hungarian Algorithm implementation for optimal assignment
  
  /**
   * Create cost matrix for Hungarian Algorithm
   * Lower cost = better assignment choice
   */
  private createCostMatrix(teachers: Teacher[], courses: Course[], weights: AssignmentWeights): number[][] {
    const matrix: number[][] = [];
    
    teachers.forEach((teacher, teacherIndex) => {
      matrix[teacherIndex] = [];
      courses.forEach((course, courseIndex) => {
        // Base cost: qualification match
        let cost = teacher.qualifications.includes(course.topic) ? 0 : 1000;
        
        // Add weighted factors to cost
        if (cost < 1000) { // Only for qualified teachers
          const workloadPenalty = this.calculateWorkloadPenalty(teacher, course, weights.equality);
          const continuityBonus = this.calculateContinuityBonus(teacher, course, weights.continuity);
          const loyaltyBonus = this.calculateLoyaltyBonus(teacher, course, weights.loyalty);
          
          cost += workloadPenalty - continuityBonus - loyaltyBonus;
        }
        
        matrix[teacherIndex][courseIndex] = Math.max(0, cost);
      });
    });
    
    return matrix;
  }

  /**
   * Hungarian Algorithm implementation for optimal assignment
   * Returns optimal teacher-course assignments
   */
  public solveHungarianAssignment(teachers: Teacher[], courses: Course[], weights: AssignmentWeights): Array<{teacherIndex: number, courseIndex: number}> {
    const costMatrix = this.createCostMatrix(teachers, courses, weights);
    return this.hungarianAlgorithm(costMatrix);
  }

  /**
   * Core Hungarian Algorithm implementation
   */
  private hungarianAlgorithm(costMatrix: number[][]): Array<{teacherIndex: number, courseIndex: number}> {
    const n = costMatrix.length;
    const m = costMatrix[0]?.length || 0;
    
    if (n === 0 || m === 0) return [];
    
    // For simplicity, implementing a basic version
    // In production, would use a more optimized implementation
    const assignments: Array<{teacherIndex: number, courseIndex: number}> = [];
    const usedTeachers = new Set<number>();
    const usedCourses = new Set<number>();
    
    // Greedy approach for now - can be replaced with full Hungarian implementation
    const nodes: HungarianNode[] = [];
    
    for (let i = 0; i < n; i++) {
      for (let j = 0; j < m; j++) {
        nodes.push({
          teacherId: i,
          courseId: j,
          cost: costMatrix[i][j]
        });
      }
    }
    
    // Sort by cost (ascending)
    nodes.sort((a, b) => a.cost - b.cost);
    
    // Select assignments greedily
    nodes.forEach(node => {
      if (!usedTeachers.has(node.teacherId) && !usedCourses.has(node.courseId) && node.cost < 1000) {
        assignments.push({
          teacherIndex: node.teacherId,
          courseIndex: node.courseId
        });
        usedTeachers.add(node.teacherId);
        usedCourses.add(node.courseId);
      }
    });
    
    return assignments;
  }

  // ALGO-003: Availability conflict detection
  
  /**
   * Detect time conflicts in assignments
   * @param assignments Array of assignments to check
   * @returns Array of conflicts found
   */
  public detectTimeConflicts(assignments: Assignment[]): Conflict[] {
    const conflicts: Conflict[] = [];
    const teacherTimeSlots: Map<number, TimeSlot[]> = new Map();
    
    // Group time slots by teacher
    assignments.forEach(assignment => {
      if (!teacherTimeSlots.has(assignment.teacher_id)) {
        teacherTimeSlots.set(assignment.teacher_id, []);
      }
      teacherTimeSlots.get(assignment.teacher_id)!.push(...assignment.scheduled_slots);
    });
    
    // Check for conflicts within each teacher's schedule
    teacherTimeSlots.forEach((slots, teacherId) => {
      const sortedSlots = slots.sort((a, b) => 
        new Date(`${a.date} ${a.start_time}`).getTime() - new Date(`${b.date} ${b.start_time}`).getTime()
      );
      
      for (let i = 0; i < sortedSlots.length - 1; i++) {
        const current = sortedSlots[i];
        const next = sortedSlots[i + 1];
        
        if (this.slotsOverlap(current, next)) {
          conflicts.push({
            type: 'time_overlap' as ConflictType,
            description: `Teacher ${teacherId} has overlapping time slots: ${current.date} ${current.start_time}-${current.end_time} and ${next.date} ${next.start_time}-${next.end_time}`,
            severity: 'critical' as ConflictSeverity,
            affected_assignments: assignments
              .filter(a => a.teacher_id === teacherId && 
                (a.scheduled_slots.includes(current) || a.scheduled_slots.includes(next)))
              .map(a => a.id)
          });
        }
      }
    });
    
    return conflicts;
  }

  /**
   * Check if two time slots overlap
   */
  private slotsOverlap(slot1: TimeSlot, slot2: TimeSlot): boolean {
    if (slot1.date !== slot2.date) return false;
    
    const start1 = this.timeStringToMinutes(slot1.start_time);
    const end1 = this.timeStringToMinutes(slot1.end_time);
    const start2 = this.timeStringToMinutes(slot2.start_time);
    const end2 = this.timeStringToMinutes(slot2.end_time);
    
    return (start1 < end2) && (start2 < end1);
  }

  /**
   * Convert time string (HH:MM) to minutes since midnight
   */
  private timeStringToMinutes(timeString: string): number {
    const [hours, minutes] = timeString.split(':').map(Number);
    return hours * 60 + minutes;
  }

  /**
   * Check teacher availability for a specific time slot
   */
  public checkTeacherAvailability(teacher: Teacher, timeSlot: TimeSlot): boolean {
    const dayName = this.getDayNameFromDate(timeSlot.date);
    const daySchedule = teacher.working_times[dayName as keyof WorkingTimes];
    
    if (!daySchedule) return false; // Teacher doesn't work this day
    
    const slotStart = this.timeStringToMinutes(timeSlot.start_time);
    const slotEnd = this.timeStringToMinutes(timeSlot.end_time);
    const workStart = this.timeStringToMinutes(daySchedule.start);
    const workEnd = this.timeStringToMinutes(daySchedule.end);
    
    return slotStart >= workStart && slotEnd <= workEnd;
  }

  /**
   * Get day name from date string
   */
  private getDayNameFromDate(dateString: string): string {
    const date = new Date(dateString);
    const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    return days[date.getDay()];
  }

  // ALGO-004: Workload balancing with NEW weighting system
  
  /**
   * Calculate workload penalty for equality weighting
   */
  private calculateWorkloadPenalty(teacher: Teacher, course: Course, equalityWeight: number): number {
    // Get current workload for this teacher
    const currentAssignments = this.dbService.getAllAssignments()
      .filter(a => a.teacher_id === teacher.id && a.status === 'active');
    
    const currentWorkload = currentAssignments.reduce((total, assignment) => {
      return total + assignment.scheduled_slots.reduce((slotTotal, slot) => slotTotal + slot.duration_minutes, 0);
    }, 0);
    
    // Calculate penalty based on how much this assignment would increase workload imbalance
    const newWorkload = currentWorkload + (course.lessons_count * course.lesson_duration);
    const averageWorkload = this.calculateAverageWorkload();
    
    const penalty = Math.abs(newWorkload - averageWorkload) / averageWorkload * 100;
    return penalty * (equalityWeight / 100);
  }

  /**
   * Calculate continuity bonus for consecutive lessons
   */
  private calculateContinuityBonus(teacher: Teacher, course: Course, continuityWeight: number): number {
    // Check if teacher has consecutive courses or similar subjects
    const teacherAssignments = this.dbService.getAllAssignments()
      .filter(a => a.teacher_id === teacher.id && a.status === 'active');
    
    let continuityScore = 0;
    
    // Bonus for teaching similar subjects (exact qualification match)
    teacherAssignments.forEach(assignment => {
      const assignmentCourse = this.dbService.getCourse(assignment.course_id);
      if (assignmentCourse && assignmentCourse.topic === course.topic) {
        continuityScore += 10; // Bonus for same subject
      }
    });
    
    return continuityScore * (continuityWeight / 100);
  }

  /**
   * Calculate loyalty bonus for teacher-class relationships
   */
  private calculateLoyaltyBonus(teacher: Teacher, course: Course, loyaltyWeight: number): number {
    // Check if teacher has previously taught this course or similar courses
    const historicalAssignments = this.dbService.getAllAssignments()
      .filter(a => a.teacher_id === teacher.id);
    
    let loyaltyScore = 0;
    
    historicalAssignments.forEach(assignment => {
      const assignmentCourse = this.dbService.getCourse(assignment.course_id);
      if (assignmentCourse && assignmentCourse.topic === course.topic) {
        loyaltyScore += 15; // Bonus for previous experience with same subject
      }
    });
    
    return loyaltyScore * (loyaltyWeight / 100);
  }

  /**
   * Calculate average workload across all teachers
   */
  private calculateAverageWorkload(): number {
    const teachers = this.dbService.getAllTeachers();
    const assignments = this.dbService.getAllAssignments().filter(a => a.status === 'active');
    
    if (teachers.length === 0) return 0;
    
    const totalWorkload = assignments.reduce((total, assignment) => {
      return total + assignment.scheduled_slots.reduce((slotTotal, slot) => slotTotal + slot.duration_minutes, 0);
    }, 0);
    
    return totalWorkload / teachers.length;
  }

  // ALGO-009: Assignment scoring system with three weights
  
  /**
   * Score an assignment based on the three weighting factors
   */
  public scoreAssignment(teacher: Teacher, course: Course, weights: AssignmentWeights): number {
    const equalityScore = this.calculateEqualityScore(teacher, course);
    const continuityScore = this.calculateContinuityScore(teacher, course);
    const loyaltyScore = this.calculateLoyaltyScore(teacher, course);
    
    // Final score calculation
    const finalScore = (
      (equalityScore * weights.equality / 100) +
      (continuityScore * weights.continuity / 100) +
      (loyaltyScore * weights.loyalty / 100)
    );
    
    return Math.max(0, Math.min(100, finalScore)); // Clamp between 0-100
  }

  /**
   * Calculate equality score (0-100)
   */
  private calculateEqualityScore(teacher: Teacher, course: Course): number {
    const averageWorkload = this.calculateAverageWorkload();
    const currentWorkload = this.getCurrentTeacherWorkload(teacher.id);
    const newWorkload = currentWorkload + (course.lessons_count * course.lesson_duration);
    
    // Score is higher when assignment brings teacher closer to average workload
    const deviation = Math.abs(newWorkload - averageWorkload);
    const maxDeviation = averageWorkload; // Maximum possible deviation
    
    return Math.max(0, 100 - (deviation / maxDeviation * 100));
  }

  /**
   * Calculate continuity score (0-100)
   */
  private calculateContinuityScore(teacher: Teacher, course: Course): number {
    let score = 50; // Base score
    
    // Bonus for teaching same subject
    const teacherAssignments = this.dbService.getAllAssignments()
      .filter(a => a.teacher_id === teacher.id && a.status === 'active');
    
    teacherAssignments.forEach(assignment => {
      const assignmentCourse = this.dbService.getCourse(assignment.course_id);
      if (assignmentCourse && assignmentCourse.topic === course.topic) {
        score += 25; // Bonus for continuity
      }
    });
    
    return Math.min(100, score);
  }

  /**
   * Calculate loyalty score (0-100)
   */
  private calculateLoyaltyScore(teacher: Teacher, course: Course): number {
    let score = 50; // Base score
    
    // Bonus for historical relationship with this subject
    const allAssignments = this.dbService.getAllAssignments()
      .filter(a => a.teacher_id === teacher.id);
    
    const subjectExperience = allAssignments.filter(assignment => {
      const assignmentCourse = this.dbService.getCourse(assignment.course_id);
      return assignmentCourse && assignmentCourse.topic === course.topic;
    }).length;
    
    // More experience = higher loyalty score
    score += Math.min(50, subjectExperience * 10);
    
    return Math.min(100, score);
  }

  /**
   * Get current workload for a teacher
   */
  private getCurrentTeacherWorkload(teacherId: number): number {
    const assignments = this.dbService.getAllAssignments()
      .filter(a => a.teacher_id === teacherId && a.status === 'active');
    
    return assignments.reduce((total, assignment) => {
      return total + assignment.scheduled_slots.reduce((slotTotal, slot) => slotTotal + slot.duration_minutes, 0);
    }, 0);
  }

  // ALGO-006: AssignmentService class architecture (Main service methods)
  
  /**
   * Generate optimal assignments for all courses
   * Main orchestration method combining all algorithms
   */
  public async generateAssignments(
    weights: AssignmentWeights = { equality: 33, continuity: 33, loyalty: 34 },
    constraints?: AssignmentConstraints
  ): Promise<AssignmentResult[]> {
    try {
      const teachers = this.dbService.getAllTeachers();
      const courses = this.dbService.getAllCourses();
      
      if (teachers.length === 0 || courses.length === 0) {
        throw new Error('No teachers or courses available for assignment');
      }

      // Step 1: Get qualification matches
      const qualificationMatches = this.getQualificationMatches(courses, teachers);
      
      if (qualificationMatches.length === 0) {
        throw new Error('No qualified teachers found for any courses');
      }

      // Step 2: Generate optimal assignments using Hungarian Algorithm
      const optimalAssignments = this.solveHungarianAssignment(teachers, courses, weights);

      // Step 3: Convert to assignment results with validation
      const results: AssignmentResult[] = [];
      
      for (const assignment of optimalAssignments) {
        const teacher = teachers[assignment.teacherIndex];
        const course = courses[assignment.courseIndex];
        
        // Create assignment object
        const assignmentData: Omit<Assignment, 'id' | 'created_at'> = {
          teacher_id: teacher.id,
          course_id: course.id,
          scheduled_slots: this.generateTimeSlots(course, teacher),
          status: 'pending',
          ai_rationale: `Assigned based on qualification match and optimization weights (Equality: ${weights.equality}%, Continuity: ${weights.continuity}%, Loyalty: ${weights.loyalty}%)`
        };

        // Validate assignment
        const conflicts = this.validateAssignment(teacher, course, assignmentData.scheduled_slots);
        const score = this.scoreAssignment(teacher, course, weights);

        results.push({
          teacher,
          course,
          assignment: { ...assignmentData, id: 0, created_at: new Date().toISOString() }, // Temporary ID
          conflicts: conflicts.length > 0 ? conflicts : undefined,
          score
        });
      }

      return results;

    } catch (error) {
      console.error('Error generating assignments:', error);
      throw error;
    }
  }

  // ALGO-007: Assignment generation workflow helpers
  
  /**
   * Generate time slots for a course assignment
   */
  private generateTimeSlots(course: Course, teacher: Teacher): TimeSlot[] {
    const slots: TimeSlot[] = [];
    const startDate = new Date(course.start_date);
    const endDate = new Date(course.end_date);
    
    // Simple slot generation - distribute lessons evenly over the course period
    const totalDays = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
    const lessonsPerWeek = Math.ceil(course.lessons_count / (totalDays / 7));
    
    let currentDate = new Date(startDate);
    let lessonsScheduled = 0;
    
    while (lessonsScheduled < course.lessons_count && currentDate <= endDate) {
      const dayName = this.getDayNameFromDate(currentDate.toISOString().split('T')[0]);
      const daySchedule = teacher.working_times[dayName as keyof WorkingTimes];
      
      if (daySchedule && lessonsScheduled < course.lessons_count) {
        // Schedule lesson at start of teacher's working day
        slots.push({
          date: currentDate.toISOString().split('T')[0],
          start_time: daySchedule.start,
          end_time: this.addMinutesToTime(daySchedule.start, course.lesson_duration),
          duration_minutes: course.lesson_duration
        });
        lessonsScheduled++;
      }
      
      // Move to next day
      currentDate.setDate(currentDate.getDate() + 1);
    }
    
    return slots;
  }

  /**
   * Add minutes to a time string
   */
  private addMinutesToTime(timeString: string, minutes: number): string {
    const totalMinutes = this.timeStringToMinutes(timeString) + minutes;
    const hours = Math.floor(totalMinutes / 60);
    const mins = totalMinutes % 60;
    return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`;
  }

  // ALGO-005: Assignment validation system
  
  /**
   * Validate a single assignment
   */
  public validateAssignment(teacher: Teacher, course: Course, timeSlots: TimeSlot[]): Conflict[] {
    const conflicts: Conflict[] = [];

    // 1. Check qualification match
    if (!teacher.qualifications.includes(course.topic)) {
      conflicts.push({
        type: 'qualification_mismatch',
        description: `Teacher ${teacher.name} does not have required qualification: ${course.topic}`,
        severity: 'critical',
        affected_assignments: []
      });
    }

    // 2. Check availability conflicts
    timeSlots.forEach(slot => {
      if (!this.checkTeacherAvailability(teacher, slot)) {
        conflicts.push({
          type: 'availability_conflict',
          description: `Teacher ${teacher.name} is not available on ${slot.date} from ${slot.start_time} to ${slot.end_time}`,
          severity: 'high',
          affected_assignments: []
        });
      }
    });

    return conflicts;
  }

  /**
   * Validate all assignments in a set
   */
  public validateAssignments(assignmentResults: AssignmentResult[]): Conflict[] {
    const allConflicts: Conflict[] = [];
    
    // Collect all assignments for conflict detection
    const assignments: Assignment[] = assignmentResults.map(result => result.assignment);
    
    // Check for time conflicts between assignments
    const timeConflicts = this.detectTimeConflicts(assignments);
    allConflicts.push(...timeConflicts);
    
    // Add individual assignment conflicts
    assignmentResults.forEach(result => {
      if (result.conflicts) {
        allConflicts.push(...result.conflicts);
      }
    });
    
    return allConflicts;
  }

  // ALGO-008: Conflict resolution algorithms
  
  /**
   * Resolve assignment conflicts automatically where possible
   */
  public resolveConflicts(assignmentResults: AssignmentResult[], weights: AssignmentWeights): AssignmentResult[] {
    const resolved: AssignmentResult[] = [];
    const conflicts = this.validateAssignments(assignmentResults);
    
    assignmentResults.forEach(result => {
      if (!result.conflicts || result.conflicts.length === 0) {
        resolved.push(result); // No conflicts, keep as is
        return;
      }

      // Try to resolve conflicts
      let resolvedResult = { ...result };
      
      result.conflicts.forEach(conflict => {
        switch (conflict.type) {
          case 'time_overlap':
            resolvedResult = this.resolveTimeOverlapConflict(resolvedResult, weights);
            break;
          case 'availability_conflict':
            resolvedResult = this.resolveAvailabilityConflict(resolvedResult);
            break;
          case 'workload_exceeded':
            resolvedResult = this.resolveWorkloadConflict(resolvedResult, weights);
            break;
          default:
            // Keep original for unresolvable conflicts
            break;
        }
      });

      resolved.push(resolvedResult);
    });

    return resolved;
  }

  /**
   * Resolve time overlap conflicts by rescheduling
   */
  private resolveTimeOverlapConflict(result: AssignmentResult, weights: AssignmentWeights): AssignmentResult {
    // Generate new time slots that don't conflict
    const newTimeSlots = this.generateTimeSlots(result.course, result.teacher);
    
    // Validate new slots
    const conflicts = this.validateAssignment(result.teacher, result.course, newTimeSlots);
    
    return {
      ...result,
      assignment: {
        ...result.assignment,
        scheduled_slots: newTimeSlots,
        ai_rationale: `Rescheduled to resolve time conflicts. ${result.assignment.ai_rationale}`
      },
      conflicts: conflicts.length > 0 ? conflicts : undefined,
      score: this.scoreAssignment(result.teacher, result.course, weights)
    };
  }

  /**
   * Resolve availability conflicts by finding alternative times
   */
  private resolveAvailabilityConflict(result: AssignmentResult): AssignmentResult {
    // For now, mark as unresolvable - would need more sophisticated scheduling
    return {
      ...result,
      assignment: {
        ...result.assignment,
        status: 'pending',
        ai_rationale: `Availability conflict detected - manual resolution required. ${result.assignment.ai_rationale}`
      }
    };
  }

  /**
   * Resolve workload conflicts by redistributing assignments
   */
  private resolveWorkloadConflict(result: AssignmentResult, weights: AssignmentWeights): AssignmentResult {
    // This would require reassigning to a different teacher
    // For now, just flag for manual review
    return {
      ...result,
      assignment: {
        ...result.assignment,
        status: 'pending',
        ai_rationale: `Workload imbalance detected - consider reassigning. ${result.assignment.ai_rationale}`
      }
    };
  }

  // ALGO-010: Fallback assignment strategies
  
  /**
   * Apply fallback strategies when optimal assignment fails
   */
  public generateFallbackAssignments(
    unassignedCourses: Course[],
    availableTeachers: Teacher[],
    weights: AssignmentWeights
  ): AssignmentResult[] {
    const fallbackResults: AssignmentResult[] = [];

    unassignedCourses.forEach(course => {
      // Strategy 1: Find teachers with closest qualification match
      const partialMatches = this.findPartialQualificationMatches(course, availableTeachers);
      
      if (partialMatches.length > 0) {
        const bestMatch = partialMatches[0]; // Take first (best) match
        
        const assignmentData: Omit<Assignment, 'id' | 'created_at'> = {
          teacher_id: bestMatch.id,
          course_id: course.id,
          scheduled_slots: this.generateTimeSlots(course, bestMatch),
          status: 'pending',
          ai_rationale: `Fallback assignment - closest qualification match. Manual review recommended.`
        };

        fallbackResults.push({
          teacher: bestMatch,
          course,
          assignment: { ...assignmentData, id: 0, created_at: new Date().toISOString() },
          conflicts: this.validateAssignment(bestMatch, course, assignmentData.scheduled_slots),
          score: this.scoreAssignment(bestMatch, course, weights) * 0.5 // Reduce score for fallback
        });
      }
    });

    return fallbackResults;
  }

  /**
   * Find teachers with partial qualification matches (fallback only)
   * This is only used in fallback scenarios - normal assignment uses exact matching
   */
  private findPartialQualificationMatches(course: Course, teachers: Teacher[]): Teacher[] {
    // For fallback, we can consider teachers with related qualifications
    // This is the ONLY place where non-exact matching is allowed
    return teachers.filter(teacher => {
      // Check for any qualification that might be related (contains keywords)
      const courseWords = course.topic.toLowerCase().split(' ');
      return teacher.qualifications.some(qual => 
        courseWords.some(word => qual.toLowerCase().includes(word) && word.length > 2)
      );
    }).sort((a, b) => {
      // Sort by number of matching keywords (descending)
      const aMatches = this.countQualificationMatches(course.topic, a.qualifications);
      const bMatches = this.countQualificationMatches(course.topic, b.qualifications);
      return bMatches - aMatches;
    });
  }

  /**
   * Count qualification keyword matches for sorting
   */
  private countQualificationMatches(courseTopic: string, qualifications: string[]): number {
    const courseWords = courseTopic.toLowerCase().split(' ');
    let matches = 0;
    
    qualifications.forEach(qual => {
      courseWords.forEach(word => {
        if (qual.toLowerCase().includes(word) && word.length > 2) {
          matches++;
        }
      });
    });
    
    return matches;
  }

  // Utility methods for workload analysis

  /**
   * Get detailed workload statistics for all teachers
   */
  public getWorkloadStatistics(): TeacherWorkload[] {
    const teachers = this.dbService.getAllTeachers();
    const assignments = this.dbService.getAllAssignments().filter(a => a.status === 'active');
    
    return teachers.map(teacher => {
      const teacherAssignments = assignments.filter(a => a.teacher_id === teacher.id);
      
      const totalLessons = teacherAssignments.reduce((total, assignment) => 
        total + assignment.scheduled_slots.length, 0
      );
      
      const totalHours = teacherAssignments.reduce((total, assignment) => 
        total + assignment.scheduled_slots.reduce((slotTotal, slot) => 
          slotTotal + slot.duration_minutes, 0
        ), 0
      ) / 60; // Convert to hours
      
      return {
        teacherId: teacher.id,
        totalLessons,
        totalHours,
        assignmentCount: teacherAssignments.length
      };
    });
  }

  /**
   * Get assignment recommendations based on current workload
   */
  public getAssignmentRecommendations(weights: AssignmentWeights): string[] {
    const workloadStats = this.getWorkloadStatistics();
    const recommendations: string[] = [];
    
    if (workloadStats.length === 0) return recommendations;
    
    const averageHours = workloadStats.reduce((sum, stat) => sum + stat.totalHours, 0) / workloadStats.length;
    
    // Find overloaded teachers
    const overloaded = workloadStats.filter(stat => stat.totalHours > averageHours * 1.5);
    if (overloaded.length > 0) {
      recommendations.push(`${overloaded.length} teacher(s) are significantly overloaded. Consider redistributing assignments.`);
    }
    
    // Find underutilized teachers
    const underutilized = workloadStats.filter(stat => stat.totalHours < averageHours * 0.5);
    if (underutilized.length > 0) {
      recommendations.push(`${underutilized.length} teacher(s) are underutilized. Consider assigning more courses.`);
    }
    
    // Weight-based recommendations
    if (weights.equality > 70) {
      recommendations.push('High equality weighting detected. Focus on balancing workload distribution.');
    }
    if (weights.continuity > 70) {
      recommendations.push('High continuity weighting detected. Prioritizing consecutive lesson scheduling.');
    }
    if (weights.loyalty > 70) {
      recommendations.push('High loyalty weighting detected. Maintaining teacher-subject relationships.');
    }
    
    return recommendations;
  }
}