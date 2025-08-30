import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';
import { 
  Teacher, 
  Course, 
  Assignment, 
  AppSettings, 
  WeightingSettings, 
  ChatMessage, 
  ChatConversation 
} from '../types';

/**
 * Database service for managing SQLite operations
 * Provides a centralized interface for all database interactions
 */
export class DatabaseService {
  private db: Database.Database;
  private static instance: DatabaseService;

  constructor(dbPath?: string) {
    // Default database path in user data directory
    const defaultPath = dbPath || path.join(process.cwd(), 'database', 'teacher-assignment.db');
    
    // Ensure database directory exists
    const dbDir = path.dirname(defaultPath);
    if (!fs.existsSync(dbDir)) {
      fs.mkdirSync(dbDir, { recursive: true });
    }

    this.db = new Database(defaultPath);
    this.initializeDatabase();
  }

  /**
   * Get singleton instance of DatabaseService
   */
  public static getInstance(dbPath?: string): DatabaseService {
    if (!DatabaseService.instance) {
      DatabaseService.instance = new DatabaseService(dbPath);
    }
    return DatabaseService.instance;
  }

  /**
   * Initialize database with schema
   */
  private initializeDatabase(): void {
    try {
      const schemaPath = path.join(process.cwd(), 'database', 'schema.sql');
      if (fs.existsSync(schemaPath)) {
        const schema = fs.readFileSync(schemaPath, 'utf8');
        this.db.exec(schema);
        console.log('Database initialized successfully');
      } else {
        throw new Error('Schema file not found');
      }
    } catch (error) {
      console.error('Failed to initialize database:', error);
      throw error;
    }
  }

  // TEACHER OPERATIONS
  
  /**
   * Create a new teacher
   */
  public createTeacher(teacher: Omit<Teacher, 'id' | 'created_at'>): Teacher {
    const stmt = this.db.prepare(`
      INSERT INTO teachers (name, qualifications, working_times)
      VALUES (?, ?, ?)
    `);
    
    const result = stmt.run(
      teacher.name,
      JSON.stringify(teacher.qualifications),
      JSON.stringify(teacher.working_times)
    );

    return this.getTeacher(result.lastInsertRowid as number)!;
  }

  /**
   * Get teacher by ID
   */
  public getTeacher(id: number): Teacher | null {
    const stmt = this.db.prepare('SELECT * FROM teachers WHERE id = ?');
    const row = stmt.get(id) as any;
    
    if (!row) return null;
    
    return {
      id: row.id,
      name: row.name,
      qualifications: JSON.parse(row.qualifications),
      working_times: JSON.parse(row.working_times || '{}'),
      created_at: row.created_at
    };
  }

  /**
   * Get all teachers
   */
  public getAllTeachers(): Teacher[] {
    const stmt = this.db.prepare('SELECT * FROM teachers ORDER BY name');
    const rows = stmt.all() as any[];
    
    return rows.map(row => ({
      id: row.id,
      name: row.name,
      qualifications: JSON.parse(row.qualifications),
      working_times: JSON.parse(row.working_times || '{}'),
      created_at: row.created_at
    }));
  }

  /**
   * Update teacher
   */
  public updateTeacher(id: number, updates: Partial<Omit<Teacher, 'id' | 'created_at'>>): Teacher | null {
    const currentTeacher = this.getTeacher(id);
    if (!currentTeacher) return null;

    const stmt = this.db.prepare(`
      UPDATE teachers 
      SET name = ?, qualifications = ?, working_times = ?
      WHERE id = ?
    `);
    
    stmt.run(
      updates.name ?? currentTeacher.name,
      JSON.stringify(updates.qualifications ?? currentTeacher.qualifications),
      JSON.stringify(updates.working_times ?? currentTeacher.working_times),
      id
    );

    return this.getTeacher(id);
  }

  /**
   * Delete teacher
   */
  public deleteTeacher(id: number): boolean {
    const stmt = this.db.prepare('DELETE FROM teachers WHERE id = ?');
    const result = stmt.run(id);
    return result.changes > 0;
  }

  // COURSE OPERATIONS
  
  /**
   * Create a new course
   */
  public createCourse(course: Omit<Course, 'id' | 'created_at'>): Course {
    const stmt = this.db.prepare(`
      INSERT INTO courses (topic, lessons_count, lesson_duration, start_date, end_date)
      VALUES (?, ?, ?, ?, ?)
    `);
    
    const result = stmt.run(
      course.topic,
      course.lessons_count,
      course.lesson_duration,
      course.start_date,
      course.end_date
    );

    return this.getCourse(result.lastInsertRowid as number)!;
  }

  /**
   * Get course by ID
   */
  public getCourse(id: number): Course | null {
    const stmt = this.db.prepare('SELECT * FROM courses WHERE id = ?');
    const row = stmt.get(id) as any;
    
    if (!row) return null;
    
    return {
      id: row.id,
      topic: row.topic,
      lessons_count: row.lessons_count,
      lesson_duration: row.lesson_duration,
      start_date: row.start_date,
      end_date: row.end_date,
      created_at: row.created_at
    };
  }

  /**
   * Get all courses
   */
  public getAllCourses(): Course[] {
    const stmt = this.db.prepare('SELECT * FROM courses ORDER BY start_date');
    const rows = stmt.all() as any[];
    
    return rows.map(row => ({
      id: row.id,
      topic: row.topic,
      lessons_count: row.lessons_count,
      lesson_duration: row.lesson_duration,
      start_date: row.start_date,
      end_date: row.end_date,
      created_at: row.created_at
    }));
  }

  /**
   * Update course
   */
  public updateCourse(id: number, updates: Partial<Omit<Course, 'id' | 'created_at'>>): Course | null {
    const currentCourse = this.getCourse(id);
    if (!currentCourse) return null;

    const stmt = this.db.prepare(`
      UPDATE courses 
      SET topic = ?, lessons_count = ?, lesson_duration = ?, start_date = ?, end_date = ?
      WHERE id = ?
    `);
    
    stmt.run(
      updates.topic ?? currentCourse.topic,
      updates.lessons_count ?? currentCourse.lessons_count,
      updates.lesson_duration ?? currentCourse.lesson_duration,
      updates.start_date ?? currentCourse.start_date,
      updates.end_date ?? currentCourse.end_date,
      id
    );

    return this.getCourse(id);
  }

  /**
   * Delete course
   */
  public deleteCourse(id: number): boolean {
    const stmt = this.db.prepare('DELETE FROM courses WHERE id = ?');
    const result = stmt.run(id);
    return result.changes > 0;
  }

  // ASSIGNMENT OPERATIONS
  
  /**
   * Create a new assignment
   */
  public createAssignment(assignment: Omit<Assignment, 'id' | 'created_at'>): Assignment {
    const stmt = this.db.prepare(`
      INSERT INTO assignments (teacher_id, course_id, scheduled_slots, status, ai_rationale)
      VALUES (?, ?, ?, ?, ?)
    `);
    
    const result = stmt.run(
      assignment.teacher_id,
      assignment.course_id,
      JSON.stringify(assignment.scheduled_slots || []),
      assignment.status || 'active',
      assignment.ai_rationale || null
    );

    return this.getAssignment(result.lastInsertRowid as number)!;
  }

  /**
   * Get assignment by ID
   */
  public getAssignment(id: number): Assignment | null {
    const stmt = this.db.prepare(`
      SELECT a.*, t.name as teacher_name, c.topic as course_topic
      FROM assignments a
      LEFT JOIN teachers t ON a.teacher_id = t.id
      LEFT JOIN courses c ON a.course_id = c.id
      WHERE a.id = ?
    `);
    const row = stmt.get(id) as any;
    
    if (!row) return null;
    
    return {
      id: row.id,
      teacher_id: row.teacher_id,
      course_id: row.course_id,
      scheduled_slots: JSON.parse(row.scheduled_slots || '[]'),
      status: row.status,
      ai_rationale: row.ai_rationale,
      created_at: row.created_at
    };
  }

  /**
   * Get all assignments with related data
   */
  public getAllAssignments(): Assignment[] {
    const stmt = this.db.prepare(`
      SELECT a.*, t.name as teacher_name, c.topic as course_topic
      FROM assignments a
      LEFT JOIN teachers t ON a.teacher_id = t.id
      LEFT JOIN courses c ON a.course_id = c.id
      ORDER BY a.created_at DESC
    `);
    const rows = stmt.all() as any[];
    
    return rows.map(row => ({
      id: row.id,
      teacher_id: row.teacher_id,
      course_id: row.course_id,
      scheduled_slots: JSON.parse(row.scheduled_slots || '[]'),
      status: row.status,
      ai_rationale: row.ai_rationale,
      created_at: row.created_at
    }));
  }

  /**
   * Update assignment
   */
  public updateAssignment(id: number, updates: Partial<Omit<Assignment, 'id' | 'created_at'>>): Assignment | null {
    const currentAssignment = this.getAssignment(id);
    if (!currentAssignment) return null;

    const stmt = this.db.prepare(`
      UPDATE assignments 
      SET teacher_id = ?, course_id = ?, scheduled_slots = ?, status = ?, ai_rationale = ?
      WHERE id = ?
    `);
    
    stmt.run(
      updates.teacher_id ?? currentAssignment.teacher_id,
      updates.course_id ?? currentAssignment.course_id,
      JSON.stringify(updates.scheduled_slots ?? currentAssignment.scheduled_slots),
      updates.status ?? currentAssignment.status,
      updates.ai_rationale ?? currentAssignment.ai_rationale,
      id
    );

    return this.getAssignment(id);
  }

  /**
   * Delete assignment
   */
  public deleteAssignment(id: number): boolean {
    const stmt = this.db.prepare('DELETE FROM assignments WHERE id = ?');
    const result = stmt.run(id);
    return result.changes > 0;
  }

  // SETTINGS OPERATIONS
  
  /**
   * Get application setting
   */
  public getSetting(key: string): string | null {
    const stmt = this.db.prepare('SELECT value FROM app_settings WHERE key = ?');
    const row = stmt.get(key) as any;
    return row ? row.value : null;
  }

  /**
   * Set application setting
   */
  public setSetting(key: string, value: string): void {
    const stmt = this.db.prepare(`
      INSERT OR REPLACE INTO app_settings (key, value)
      VALUES (?, ?)
    `);
    stmt.run(key, value);
  }

  /**
   * Get all settings
   */
  public getAllSettings(): Record<string, string> {
    const stmt = this.db.prepare('SELECT key, value FROM app_settings');
    const rows = stmt.all() as any[];
    
    const settings: Record<string, string> = {};
    rows.forEach(row => {
      settings[row.key] = row.value;
    });
    return settings;
  }

  // UTILITY OPERATIONS
  
  /**
   * Execute raw SQL query (for advanced operations)
   */
  public execute(sql: string, params?: any[]): any {
    const stmt = this.db.prepare(sql);
    return params ? stmt.run(...params) : stmt.run();
  }

  /**
   * Close database connection
   */
  public close(): void {
    if (this.db) {
      this.db.close();
    }
  }

  // ALIAS METHODS FOR SETTINGS SERVICE COMPATIBILITY
  
  /**
   * Get all weighting presets (alias for getAllWeightingSettings)
   */
  public getWeightingPresets(): WeightingSettings[] {
    return this.getAllWeightingSettings();
  }

  /**
   * Save weighting preset (alias for createWeightingSettings)
   */
  public saveWeightingPreset(preset: Omit<WeightingSettings, 'id' | 'created_at' | 'updated_at'>): void {
    this.createWeightingSettings(preset);
  }

  /**
   * Delete weighting preset (alias for deleteWeightingSettings)
   */
  public deleteWeightingPreset(id: number): void {
    this.deleteWeightingSettings(id);
  }

  /**
   * Set default weighting preset
   */
  public setDefaultWeightingPreset(id: number): void {
    // First, set all presets to non-default
    const stmt1 = this.db.prepare('UPDATE weighting_settings SET is_default = 0');
    stmt1.run();
    
    // Then set the specified preset as default
    const stmt2 = this.db.prepare('UPDATE weighting_settings SET is_default = 1 WHERE id = ?');
    stmt2.run(id);
  }

  // WEIGHTING SETTINGS OPERATIONS
  
  /**
   * Create weighting settings profile
   */
  public createWeightingSettings(settings: Omit<WeightingSettings, 'id' | 'created_at'>): WeightingSettings {
    const stmt = this.db.prepare(`
      INSERT INTO weighting_settings (profile_name, equality_weight, continuity_weight, loyalty_weight, is_default)
      VALUES (?, ?, ?, ?, ?)
    `);
    
    const result = stmt.run(
      settings.profile_name,
      settings.equality_weight,
      settings.continuity_weight,
      settings.loyalty_weight,
      settings.is_default ? 1 : 0
    );

    return this.getWeightingSettings(result.lastInsertRowid as number)!;
  }

  /**
   * Get weighting settings by ID
   */
  public getWeightingSettings(id: number): WeightingSettings | null {
    const stmt = this.db.prepare('SELECT * FROM weighting_settings WHERE id = ?');
    const row = stmt.get(id) as any;
    
    if (!row) return null;
    
    return {
      id: row.id,
      profile_name: row.profile_name,
      equality_weight: row.equality_weight,
      continuity_weight: row.continuity_weight,
      loyalty_weight: row.loyalty_weight,
      is_default: row.is_default === 1,
      created_at: row.created_at
    };
  }

  /**
   * Get default weighting settings
   */
  public getDefaultWeightingSettings(): WeightingSettings | null {
    const stmt = this.db.prepare('SELECT * FROM weighting_settings WHERE is_default = 1');
    const row = stmt.get() as any;
    
    if (!row) return null;
    
    return {
      id: row.id,
      profile_name: row.profile_name,
      equality_weight: row.equality_weight,
      continuity_weight: row.continuity_weight,
      loyalty_weight: row.loyalty_weight,
      is_default: true,
      created_at: row.created_at
    };
  }

  /**
   * Get all weighting settings profiles
   */
  public getAllWeightingSettings(): WeightingSettings[] {
    const stmt = this.db.prepare('SELECT * FROM weighting_settings ORDER BY is_default DESC, profile_name');
    const rows = stmt.all() as any[];
    
    return rows.map(row => ({
      id: row.id,
      profile_name: row.profile_name,
      equality_weight: row.equality_weight,
      continuity_weight: row.continuity_weight,
      loyalty_weight: row.loyalty_weight,
      is_default: row.is_default === 1,
      created_at: row.created_at
    }));
  }

  /**
   * Update weighting settings
   */
  public updateWeightingSettings(id: number, updates: Partial<WeightingSettings>): WeightingSettings | null {
    const currentSettings = this.getWeightingSettings(id);
    if (!currentSettings) return null;

    const stmt = this.db.prepare(`
      UPDATE weighting_settings 
      SET profile_name = ?, equality_weight = ?, continuity_weight = ?, loyalty_weight = ?, is_default = ?
      WHERE id = ?
    `);
    
    stmt.run(
      updates.profile_name ?? currentSettings.profile_name,
      updates.equality_weight ?? currentSettings.equality_weight,
      updates.continuity_weight ?? currentSettings.continuity_weight,
      updates.loyalty_weight ?? currentSettings.loyalty_weight,
      (updates.is_default ?? currentSettings.is_default) ? 1 : 0,
      id
    );

    return this.getWeightingSettings(id);
  }

  /**
   * Delete weighting settings profile
   */
  public deleteWeightingSettings(id: number): boolean {
    const stmt = this.db.prepare('DELETE FROM weighting_settings WHERE id = ?');
    const result = stmt.run(id);
    return result.changes > 0;
  }

  // CHAT OPERATIONS
  
  /**
   * Save chat message to history
   */
  public saveChatMessage(message: Omit<ChatMessage, 'id' | 'timestamp'>): ChatMessage {
    const stmt = this.db.prepare(`
      INSERT INTO chat_history (conversation_id, message_type, message_content, context_data)
      VALUES (?, ?, ?, ?)
    `);
    
    const result = stmt.run(
      message.conversation_id,
      message.message_type,
      message.message_content,
      message.context_data || null
    );

    return this.getChatMessage(result.lastInsertRowid as number)!;
  }

  /**
   * Get chat message by ID
   */
  public getChatMessage(id: number): ChatMessage | null {
    const stmt = this.db.prepare('SELECT * FROM chat_history WHERE id = ?');
    const row = stmt.get(id) as any;
    
    if (!row) return null;
    
    return {
      id: row.id,
      conversation_id: row.conversation_id,
      message_type: row.message_type,
      message_content: row.message_content,
      context_data: row.context_data,
      timestamp: row.timestamp
    };
  }

  /**
   * Get all messages for a conversation
   */
  public getChatMessages(conversationId: string): ChatMessage[] {
    const stmt = this.db.prepare(`
      SELECT * FROM chat_history 
      WHERE conversation_id = ? 
      ORDER BY timestamp ASC
    `);
    const rows = stmt.all(conversationId) as any[];
    
    return rows.map(row => ({
      id: row.id,
      conversation_id: row.conversation_id,
      message_type: row.message_type,
      message_content: row.message_content,
      context_data: row.context_data,
      timestamp: row.timestamp
    }));
  }

  /**
   * Save chat conversation metadata
   */
  public saveChatConversation(conversation: Omit<ChatConversation, 'messages' | 'created_at' | 'updated_at'>): void {
    const stmt = this.db.prepare(`
      INSERT OR REPLACE INTO chat_conversations (id, title, context_snapshot)
      VALUES (?, ?, ?)
    `);
    
    stmt.run(
      conversation.id,
      conversation.title,
      JSON.stringify(conversation.context)
    );
  }

  /**
   * Get all chat conversations
   */
  public getAllChatConversations(): ChatConversation[] {
    const stmt = this.db.prepare(`
      SELECT * FROM chat_conversations 
      ORDER BY updated_at DESC
    `);
    const rows = stmt.all() as any[];
    
    return rows.map(row => ({
      id: row.id,
      title: row.title,
      messages: this.getChatMessages(row.id),
      context: JSON.parse(row.context_snapshot || '{}'),
      created_at: row.created_at,
      updated_at: row.updated_at
    }));
  }

  /**
   * Delete chat conversation and all its messages
   */
  public deleteChatConversation(conversationId: string): boolean {
    const deleteMessages = this.db.prepare('DELETE FROM chat_history WHERE conversation_id = ?');
    const deleteConversation = this.db.prepare('DELETE FROM chat_conversations WHERE id = ?');
    
    const transaction = this.db.transaction(() => {
      deleteMessages.run(conversationId);
      deleteConversation.run(conversationId);
    });

    try {
      transaction();
      return true;
    } catch (error) {
      console.error('Failed to delete conversation:', error);
      return false;
    }
  }

  /**
   * Get database statistics including AI tables
   */
  public getStats(): { 
    teachers: number; 
    courses: number; 
    assignments: number;
    weighting_profiles: number;
    chat_conversations: number;
    chat_messages: number;
  } {
    const teacherCount = this.db.prepare('SELECT COUNT(*) as count FROM teachers').get() as any;
    const courseCount = this.db.prepare('SELECT COUNT(*) as count FROM courses').get() as any;
    const assignmentCount = this.db.prepare('SELECT COUNT(*) as count FROM assignments').get() as any;
    const weightingCount = this.db.prepare('SELECT COUNT(*) as count FROM weighting_settings').get() as any;
    const conversationCount = this.db.prepare('SELECT COUNT(*) as count FROM chat_conversations').get() as any;
    const messageCount = this.db.prepare('SELECT COUNT(*) as count FROM chat_history').get() as any;
    
    return {
      teachers: teacherCount.count,
      courses: courseCount.count,
      assignments: assignmentCount.count,
      weighting_profiles: weightingCount.count,
      chat_conversations: conversationCount.count,
      chat_messages: messageCount.count
    };
  }
}