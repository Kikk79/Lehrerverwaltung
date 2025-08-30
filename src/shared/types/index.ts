export interface Teacher {
  id: number;
  name: string;
  qualifications: string[];
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

export type ConflictType = 'time_overlap' | 'qualification_mismatch' | 'workload_exceeded' | 'availability_conflict';
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

// AI Integration Types
export interface AnthropicConfig {
  apiKey: string;
  model: AnthropicModel;
  maxTokens: number;
  temperature: number;
  systemPrompt?: string;
}

export type AnthropicModel = 'claude-haiku-3.5-20241022' | 'claude-sonnet-4-20250514' | 'claude-opus-4-20241022';

export interface AIResponse {
  content: string;
  usage?: {
    input_tokens: number;
    output_tokens: number;
  };
  request_id?: string;
}

export interface AIError {
  type: 'api_error' | 'rate_limit' | 'authentication' | 'network' | 'timeout';
  message: string;
  code?: string;
  status?: number;
}

// Weighting System Types
export interface WeightingSettings {
  id?: number;
  profile_name: string;
  equality_weight: number; // 0-100
  continuity_weight: number; // 0-100
  loyalty_weight: number; // 0-100
  is_default: boolean;
  created_at?: string;
}

export interface WeightingScore {
  equality_score: number; // 0-1
  continuity_score: number; // 0-1
  loyalty_score: number; // 0-1
  final_score: number; // weighted combination
}

export interface AssignmentWithWeighting extends AssignmentResult {
  weighting_score: WeightingScore;
}

// Chat System Types
export interface ChatMessage {
  id?: number;
  conversation_id: string;
  message_type: 'user' | 'assistant' | 'system';
  message_content: string;
  context_data?: string; // JSON string of relevant assignment data
  timestamp?: string;
}

export interface ChatConversation {
  id: string;
  title: string;
  messages: ChatMessage[];
  context: AssignmentContext;
  created_at?: string;
  updated_at?: string;
}

export interface AssignmentContext {
  teachers: Teacher[];
  courses: Course[];
  current_assignments: Assignment[];
  conflicts: Conflict[];
  weighting_settings: WeightingSettings;
}

export interface ChatSuggestion {
  type: 'reassign' | 'modify_weights' | 'add_teacher' | 'resolve_conflict';
  description: string;
  action_data: any;
  confidence: number; // 0-1
}

// System Prompt Templates
export interface PromptTemplate {
  name: string;
  template: string;
  variables: string[];
  description: string;
}

export interface AIAssignmentOptimizationRequest {
  teachers: Teacher[];
  courses: Course[];
  existing_assignments: Assignment[];
  weighting_settings: WeightingSettings;
  constraints?: AssignmentConstraints;
  chat_context?: string;
}

export interface AIOptimizationResponse {
  optimized_assignments: AssignmentWithWeighting[];
  rationale: string;
  alternatives: AssignmentWithWeighting[][];
  conflicts_resolved: Conflict[];
  suggestions: ChatSuggestion[];
}