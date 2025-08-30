export interface Teacher {
  id: number;
  name: string;
  skills: string[];
  working_times: WorkingTimes;
  created_at: string;
}

export interface Course {
  id: number;
  topic: string;
  lessons_count: number;
  lesson_duration: number;
  start_date: string;
  end_date: string;
  created_at: string;
}

export interface Assignment {
  id: number;
  teacher_id: number;
  course_id: number;
  scheduled_slots: TimeSlot[];
  status: AssignmentStatus;
  ai_rationale?: string;
  created_at: string;
}

export interface AppSettings {
  key: string;
  value: string;
}

export interface WorkingTimes {
  monday?: TimeRange;
  tuesday?: TimeRange;
  wednesday?: TimeRange;
  thursday?: TimeRange;
  friday?: TimeRange;
  saturday?: TimeRange;
  sunday?: TimeRange;
}

export interface TimeRange {
  start: string;
  end: string;
}

export interface TimeSlot {
  date: string;
  start_time: string;
  end_time: string;
  duration_minutes: number;
}

export type AssignmentStatus = 'active' | 'completed' | 'cancelled' | 'pending';

export interface AssignmentResult {
  teacher: Teacher;
  course: Course;
  assignment: Assignment;
  conflicts?: Conflict[];
  score: number;
}

export interface Conflict {
  type: ConflictType;
  description: string;
  severity: ConflictSeverity;
  affected_assignments: number[];
}

export type ConflictType = 'time_overlap' | 'skill_mismatch' | 'workload_exceeded' | 'availability_conflict';
export type ConflictSeverity = 'low' | 'medium' | 'high' | 'critical';

export interface AIAssignmentRequest {
  teachers: Teacher[];
  courses: Course[];
  existing_assignments?: Assignment[];
  constraints?: AssignmentConstraints;
}

export interface AssignmentConstraints {
  max_assignments_per_teacher?: number;
  preferred_time_slots?: TimeSlot[];
  avoid_conflicts?: boolean;
  balance_workload?: boolean;
}

export interface AIAssignmentResponse {
  assignments: AssignmentResult[];
  total_score: number;
  conflicts: Conflict[];
  rationale: string;
  alternative_suggestions?: AssignmentResult[];
}

export interface CalendarEvent {
  id: string;
  title: string;
  start: Date;
  end: Date;
  teacherId: number;
  courseId: number;
  assignmentId: number;
  backgroundColor?: string;
  borderColor?: string;
}

export interface FilterOptions {
  teachers?: number[];
  courses?: number[];
  date_range?: {
    start: string;
    end: string;
  };
  status?: AssignmentStatus[];
}

export interface ImportResult {
  success: boolean;
  imported_count: number;
  skipped_count: number;
  errors: ImportError[];
}

export interface ImportError {
  row: number;
  field: string;
  message: string;
  data: any;
}

export interface ExportOptions {
  format: ExportFormat;
  include_assignments?: boolean;
  include_teachers?: boolean;
  include_courses?: boolean;
  date_range?: {
    start: string;
    end: string;
  };
}

export type ExportFormat = 'csv' | 'ical' | 'json' | 'pdf';

export interface DatabaseError {
  code: string;
  message: string;
  constraint?: string;
}

export interface ValidationError {
  field: string;
  message: string;
  value: any;
}