import { TimeRange, TimeSlot, WorkingTimes } from '../types';

export function isTimeOverlap(slot1: TimeSlot, slot2: TimeSlot): boolean {
  if (slot1.date !== slot2.date) return false;
  
  const start1 = new Date(`${slot1.date}T${slot1.start_time}`);
  const end1 = new Date(`${slot1.date}T${slot1.end_time}`);
  const start2 = new Date(`${slot2.date}T${slot2.start_time}`);
  const end2 = new Date(`${slot2.date}T${slot2.end_time}`);
  
  return start1 < end2 && start2 < end1;
}

export function isWithinWorkingHours(slot: TimeSlot, workingTimes: WorkingTimes): boolean {
  const dayOfWeek = new Date(slot.date).toLocaleDateString('en-US', { weekday: 'lowercase' }) as keyof WorkingTimes;
  const workingHours = workingTimes[dayOfWeek];
  
  if (!workingHours) return false;
  
  const slotStart = new Date(`${slot.date}T${slot.start_time}`);
  const slotEnd = new Date(`${slot.date}T${slot.end_time}`);
  const workStart = new Date(`${slot.date}T${workingHours.start}`);
  const workEnd = new Date(`${slot.date}T${workingHours.end}`);
  
  return slotStart >= workStart && slotEnd <= workEnd;
}

export function calculateTotalDuration(slots: TimeSlot[]): number {
  return slots.reduce((total, slot) => total + slot.duration_minutes, 0);
}

export function formatDuration(minutes: number): string {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  
  if (hours === 0) return `${mins}m`;
  if (mins === 0) return `${hours}h`;
  return `${hours}h ${mins}m`;
}

export function generateTimeSlots(
  startDate: string,
  endDate: string,
  duration: number,
  lessons: number,
  workingTimes: WorkingTimes
): TimeSlot[] {
  const slots: TimeSlot[] = [];
  const start = new Date(startDate);
  const end = new Date(endDate);
  const totalDays = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
  const slotsPerWeek = Math.ceil(lessons / (totalDays / 7));
  
  let currentDate = new Date(start);
  let remainingLessons = lessons;
  
  while (currentDate <= end && remainingLessons > 0) {
    const dayOfWeek = currentDate.toLocaleDateString('en-US', { weekday: 'lowercase' }) as keyof WorkingTimes;
    const workingHours = workingTimes[dayOfWeek];
    
    if (workingHours) {
      const slot: TimeSlot = {
        date: currentDate.toISOString().split('T')[0],
        start_time: workingHours.start,
        end_time: workingHours.start,
        duration_minutes: duration
      };
      
      const startTime = new Date(`${slot.date}T${workingHours.start}`);
      const endTime = new Date(startTime.getTime() + duration * 60000);
      slot.end_time = endTime.toTimeString().substr(0, 5);
      
      const workEnd = new Date(`${slot.date}T${workingHours.end}`);
      if (endTime <= workEnd) {
        slots.push(slot);
        remainingLessons--;
      }
    }
    
    currentDate.setDate(currentDate.getDate() + 1);
  }
  
  return slots;
}

export function validateTeacher(teacher: Partial<Teacher>): string[] {
  const errors: string[] = [];
  
  if (!teacher.name?.trim()) {
    errors.push('Teacher name is required');
  }
  
  if (!teacher.skills || teacher.skills.length === 0) {
    errors.push('At least one skill is required');
  }
  
  if (teacher.skills?.some(skill => !skill.trim())) {
    errors.push('All skills must be non-empty');
  }
  
  return errors;
}

export function validateCourse(course: Partial<Course>): string[] {
  const errors: string[] = [];
  
  if (!course.topic?.trim()) {
    errors.push('Course topic is required');
  }
  
  if (!course.lessons_count || course.lessons_count <= 0) {
    errors.push('Lessons count must be greater than 0');
  }
  
  if (!course.lesson_duration || course.lesson_duration <= 0) {
    errors.push('Lesson duration must be greater than 0');
  }
  
  if (!course.start_date) {
    errors.push('Start date is required');
  }
  
  if (!course.end_date) {
    errors.push('End date is required');
  }
  
  if (course.start_date && course.end_date && new Date(course.start_date) >= new Date(course.end_date)) {
    errors.push('End date must be after start date');
  }
  
  return errors;
}

export function canTeachCourse(teacher: Teacher, course: Course): boolean {
  return teacher.skills.includes(course.topic);
}

export function getConflictingSLots(assignments: Assignment[]): TimeSlot[] {
  const allSlots: TimeSlot[] = [];
  const conflicts: TimeSlot[] = [];
  
  assignments.forEach(assignment => {
    assignment.scheduled_slots.forEach(slot => {
      const isConflicting = allSlots.some(existingSlot => isTimeOverlap(slot, existingSlot));
      if (isConflicting) {
        conflicts.push(slot);
      } else {
        allSlots.push(slot);
      }
    });
  });
  
  return conflicts;
}