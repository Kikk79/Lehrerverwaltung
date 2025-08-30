import { 
  Assignment, 
  Teacher, 
  Course, 
  CalendarEvent, 
  FilterOptions,
  TimeSlot,
  Conflict 
} from '../types';
import { DatabaseService } from './DatabaseService';
import { AssignmentService } from './AssignmentService';

/**
 * Calendar view types supported by the calendar component
 */
export type CalendarViewType = 'dayGridMonth' | 'timeGridWeek' | 'timeGridDay' | 'listWeek';

/**
 * Calendar event colors and styling
 */
export interface CalendarTheme {
  primaryColor: string;
  secondaryColor: string;
  textColor: string;
  backgroundColor: string;
  borderColor: string;
}

/**
 * Calendar display preferences
 */
export interface CalendarPreferences {
  defaultView: CalendarViewType;
  weekStart: number; // 0 = Sunday, 1 = Monday
  timeFormat: '24h' | '12h';
  slotDuration: string; // e.g., '00:30:00' for 30 minutes
  theme: CalendarTheme;
  showWeekends: boolean;
  locale: string;
}

/**
 * Calendar event drag and drop result
 */
export interface EventDropResult {
  success: boolean;
  updatedAssignment?: Assignment;
  conflicts?: Conflict[];
  message?: string;
}

/**
 * Calendar Service for managing calendar events and synchronization
 * Handles event creation, filtering, drag-drop operations, and data sync
 */
export class CalendarService {
  private dbService: DatabaseService;
  private assignmentService: AssignmentService;
  private defaultPreferences: CalendarPreferences;

  constructor(dbService?: DatabaseService, assignmentService?: AssignmentService) {
    this.dbService = dbService || DatabaseService.getInstance();
    this.assignmentService = assignmentService || new AssignmentService(this.dbService);
    
    // Default calendar preferences with Outlook-like styling
    this.defaultPreferences = {
      defaultView: 'timeGridWeek',
      weekStart: 1, // Monday
      timeFormat: '24h',
      slotDuration: '00:30:00',
      theme: {
        primaryColor: '#0078d4', // Outlook blue
        secondaryColor: '#106ebe',
        textColor: '#323130',
        backgroundColor: '#ffffff',
        borderColor: '#d1d1d1'
      },
      showWeekends: true,
      locale: 'de'
    };
  }

  /**
   * Convert assignments to calendar events for FullCalendar
   * @param assignments Array of assignments to convert
   * @param teachers Array of teachers for teacher data
   * @param courses Array of courses for course data
   * @returns Array of calendar events
   */
  public convertAssignmentsToCalendarEvents(
    assignments: Assignment[],
    teachers?: Teacher[],
    courses?: Course[]
  ): CalendarEvent[] {
    const teacherMap = new Map(teachers?.map(t => [t.id, t]) || []);
    const courseMap = new Map(courses?.map(c => [c.id, c]) || []);

    // If not provided, fetch from database
    if (!teachers || !courses) {
      const allTeachers = this.dbService.getAllTeachers();
      const allCourses = this.dbService.getAllCourses();
      
      allTeachers.forEach(t => teacherMap.set(t.id, t));
      allCourses.forEach(c => courseMap.set(c.id, c));
    }

    const events: CalendarEvent[] = [];

    assignments.forEach(assignment => {
      const teacher = teacherMap.get(assignment.teacher_id);
      const course = courseMap.get(assignment.course_id);

      if (!teacher || !course) return;

      // Create an event for each scheduled time slot
      assignment.scheduled_slots.forEach(slot => {
        const startDateTime = this.combineDateTime(slot.date, slot.start_time);
        const endDateTime = this.combineDateTime(slot.date, slot.end_time);

        const event: CalendarEvent = {
          id: `${assignment.id}-${slot.date}-${slot.start_time}`,
          title: `${course.topic}`,
          start: startDateTime,
          end: endDateTime,
          teacherId: teacher.id,
          courseId: course.id,
          assignmentId: assignment.id,
          backgroundColor: this.getTeacherColor(teacher.id),
          borderColor: this.getTeacherColor(teacher.id, true)
        };

        events.push(event);
      });
    });

    return events;
  }

  /**
   * Filter calendar events based on provided filter options
   * @param events Array of calendar events to filter
   * @param filterOptions Filter criteria
   * @returns Filtered array of calendar events
   */
  public filterCalendarEvents(events: CalendarEvent[], filterOptions: FilterOptions): CalendarEvent[] {
    return events.filter(event => {
      // Filter by teachers
      if (filterOptions.teachers && filterOptions.teachers.length > 0) {
        if (!filterOptions.teachers.includes(event.teacherId)) {
          return false;
        }
      }

      // Filter by courses
      if (filterOptions.courses && filterOptions.courses.length > 0) {
        if (!filterOptions.courses.includes(event.courseId)) {
          return false;
        }
      }

      // Filter by date range
      if (filterOptions.date_range) {
        const eventDate = event.start.toISOString().split('T')[0];
        if (eventDate < filterOptions.date_range.start || eventDate > filterOptions.date_range.end) {
          return false;
        }
      }

      // Filter by assignment status
      if (filterOptions.status && filterOptions.status.length > 0) {
        const assignment = this.dbService.getAssignment(event.assignmentId);
        if (!assignment || !filterOptions.status.includes(assignment.status)) {
          return false;
        }
      }

      return true;
    });
  }

  /**
   * Handle calendar event drop (drag and drop rescheduling)
   * @param eventId The ID of the moved event
   * @param newStart New start date/time
   * @param newEnd New end date/time
   * @returns Result of the drop operation
   */
  public async handleEventDrop(
    eventId: string, 
    newStart: Date, 
    newEnd: Date
  ): Promise<EventDropResult> {
    try {
      // Parse event ID to get assignment and slot info
      const [assignmentIdStr, originalDate, originalTime] = eventId.split('-');
      const assignmentId = parseInt(assignmentIdStr);
      
      const assignment = this.dbService.getAssignment(assignmentId);
      if (!assignment) {
        return {
          success: false,
          message: 'Assignment not found'
        };
      }

      const teacher = this.dbService.getTeacher(assignment.teacher_id);
      const course = this.dbService.getCourse(assignment.course_id);
      
      if (!teacher || !course) {
        return {
          success: false,
          message: 'Teacher or course not found'
        };
      }

      // Create new time slot
      const newSlot: TimeSlot = {
        date: newStart.toISOString().split('T')[0],
        start_time: this.formatTime(newStart),
        end_time: this.formatTime(newEnd),
        duration_minutes: Math.round((newEnd.getTime() - newStart.getTime()) / (1000 * 60))
      };

      // Validate the new time slot
      const conflicts = this.validateTimeSlotMove(teacher, assignment, originalDate, originalTime, newSlot);
      
      if (conflicts.length > 0 && conflicts.some(c => c.severity === 'critical')) {
        return {
          success: false,
          conflicts,
          message: 'Critical conflicts detected - move not allowed'
        };
      }

      // Update the assignment with new time slot
      const updatedSlots = assignment.scheduled_slots.map(slot => {
        if (slot.date === originalDate && slot.start_time === originalTime) {
          return newSlot;
        }
        return slot;
      });

      const updatedAssignment: Assignment = {
        ...assignment,
        scheduled_slots: updatedSlots,
        ai_rationale: `${assignment.ai_rationale || ''} [Calendar: Rescheduled from ${originalDate} ${originalTime} to ${newSlot.date} ${newSlot.start_time}]`
      };

      // Save to database
      this.dbService.updateAssignment(updatedAssignment.id, {
        scheduled_slots: updatedSlots,
        ai_rationale: updatedAssignment.ai_rationale
      });

      return {
        success: true,
        updatedAssignment,
        conflicts: conflicts.length > 0 ? conflicts : undefined,
        message: conflicts.length > 0 ? 'Rescheduled with warnings' : 'Successfully rescheduled'
      };

    } catch (error) {
      console.error('Error handling event drop:', error);
      return {
        success: false,
        message: `Error rescheduling event: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }

  /**
   * Validate moving a time slot to detect conflicts
   */
  private validateTimeSlotMove(
    teacher: Teacher,
    assignment: Assignment,
    originalDate: string,
    originalTime: string,
    newSlot: TimeSlot
  ): Conflict[] {
    const conflicts: Conflict[] = [];

    // Check teacher availability
    if (!this.assignmentService.checkTeacherAvailability(teacher, newSlot)) {
      conflicts.push({
        type: 'availability_conflict',
        description: `German: Lehrer ${teacher.name} ist am ${newSlot.date} von ${newSlot.start_time} bis ${newSlot.end_time} nicht verfügbar`,
        severity: 'critical',
        affected_assignments: [assignment.id]
      });
    }

    // Check for time overlaps with other assignments
    const allAssignments = this.dbService.getAllAssignments()
      .filter(a => a.id !== assignment.id && a.teacher_id === teacher.id && a.status === 'active');
    
    allAssignments.forEach(otherAssignment => {
      otherAssignment.scheduled_slots.forEach(slot => {
        if (this.timeSlotsOverlap(newSlot, slot)) {
          conflicts.push({
            type: 'time_overlap',
            description: `German: Zeitkonflikt mit anderer Zuweisung am ${slot.date} von ${slot.start_time} bis ${slot.end_time}`,
            severity: 'critical',
            affected_assignments: [assignment.id, otherAssignment.id]
          });
        }
      });
    });

    return conflicts;
  }

  /**
   * Check if two time slots overlap
   */
  private timeSlotsOverlap(slot1: TimeSlot, slot2: TimeSlot): boolean {
    if (slot1.date !== slot2.date) return false;
    
    const start1 = this.timeStringToMinutes(slot1.start_time);
    const end1 = this.timeStringToMinutes(slot1.end_time);
    const start2 = this.timeStringToMinutes(slot2.start_time);
    const end2 = this.timeStringToMinutes(slot2.end_time);
    
    return (start1 < end2) && (start2 < end1);
  }

  /**
   * Get calendar preferences from database or return defaults
   */
  public getCalendarPreferences(): CalendarPreferences {
    try {
      const savedPrefs = this.dbService.getSetting('calendar_preferences');
      if (savedPrefs) {
        return { ...this.defaultPreferences, ...JSON.parse(savedPrefs) };
      }
    } catch (error) {
      console.warn('Error loading calendar preferences, using defaults:', error);
    }
    
    return this.defaultPreferences;
  }

  /**
   * Save calendar preferences to database
   */
  public saveCalendarPreferences(preferences: Partial<CalendarPreferences>): void {
    try {
      const currentPrefs = this.getCalendarPreferences();
      const updatedPrefs = { ...currentPrefs, ...preferences };
      
      this.dbService.setSetting('calendar_preferences', JSON.stringify(updatedPrefs));
    } catch (error) {
      console.error('Error saving calendar preferences:', error);
      throw error;
    }
  }

  /**
   * Get color for teacher events (consistent color per teacher)
   */
  public getTeacherColor(teacherId: number, border: boolean = false): string {
    const colors = [
      '#0078d4', '#107c10', '#d13438', '#ff8c00', '#5c2d91',
      '#0078d7', '#00bcf2', '#40e0d0', '#ff69b4', '#32cd32',
      '#ff6347', '#4169e1', '#daa520', '#dc143c', '#00ced1'
    ];
    
    const baseColor = colors[teacherId % colors.length];
    
    if (border) {
      // Darken the color for border
      return this.darkenColor(baseColor, 0.2);
    }
    
    return baseColor;
  }

  /**
   * Create event tooltip content
   */
  public createEventTooltip(event: CalendarEvent): string {
    const teacher = this.dbService.getTeacher(event.teacherId);
    const course = this.dbService.getCourse(event.courseId);
    const assignment = this.dbService.getAssignment(event.assignmentId);

    if (!teacher || !course || !assignment) {
      return 'German: Ereignisdetails nicht verfügbar';
    }

    const startTime = this.formatTime(event.start);
    const endTime = this.formatTime(event.end);
    const duration = Math.round((event.end.getTime() - event.start.getTime()) / (1000 * 60));

    return `
      <div class="calendar-tooltip">
        <h3>${course.topic}</h3>
        <p><strong>German: Lehrer:</strong> ${teacher.name}</p>
        <p><strong>German: Zeit:</strong> ${startTime} - ${endTime}</p>
        <p><strong>German: Dauer:</strong> ${duration} Minuten</p>
        <p><strong>German: Status:</strong> ${this.translateStatus(assignment.status)}</p>
      </div>
    `;
  }

  /**
   * Get all calendar events for current assignments
   */
  public getAllCalendarEvents(): CalendarEvent[] {
    const assignments = this.dbService.getAllAssignments().filter(a => a.status === 'active');
    const teachers = this.dbService.getAllTeachers();
    const courses = this.dbService.getAllCourses();
    
    return this.convertAssignmentsToCalendarEvents(assignments, teachers, courses);
  }

  /**
   * Get calendar events for a specific date range
   */
  public getCalendarEventsForRange(startDate: string, endDate: string): CalendarEvent[] {
    const allEvents = this.getAllCalendarEvents();
    return allEvents.filter(event => {
      const eventDate = event.start.toISOString().split('T')[0];
      return eventDate >= startDate && eventDate <= endDate;
    });
  }

  /**
   * Refresh calendar data after assignment changes
   */
  public refreshCalendarData(): CalendarEvent[] {
    // This method is called when assignments are updated
    // to refresh the calendar display
    return this.getAllCalendarEvents();
  }

  // Utility methods

  private combineDateTime(date: string, time: string): Date {
    return new Date(`${date}T${time}:00`);
  }

  private formatTime(date: Date): string {
    return date.toLocaleTimeString('de-DE', { 
      hour: '2-digit', 
      minute: '2-digit',
      hour12: false 
    });
  }

  private timeStringToMinutes(timeString: string): number {
    const [hours, minutes] = timeString.split(':').map(Number);
    return hours * 60 + minutes;
  }

  private darkenColor(color: string, factor: number): string {
    // Simple color darkening function
    const hex = color.replace('#', '');
    const r = Math.floor(parseInt(hex.substr(0, 2), 16) * (1 - factor));
    const g = Math.floor(parseInt(hex.substr(2, 2), 16) * (1 - factor));
    const b = Math.floor(parseInt(hex.substr(4, 2), 16) * (1 - factor));
    
    return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
  }

  private translateStatus(status: string): string {
    const translations: { [key: string]: string } = {
      'active': 'Aktiv',
      'pending': 'Ausstehend',
      'completed': 'Abgeschlossen',
      'cancelled': 'Abgebrochen'
    };
    return translations[status] || status;
  }
}