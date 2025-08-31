import fs from 'fs';
import path from 'path';

// Avoid bundling better-sqlite3 into the renderer; only load DatabaseService in non-renderer contexts
const isRenderer = typeof process !== 'undefined' && (process as any)?.type === 'renderer';
let FallbackDatabaseService: any = null;
if (!isRenderer) {
  try {
    // eslint-disable-next-line no-eval
    const nodeRequire = eval('require');
    FallbackDatabaseService = nodeRequire('./DatabaseService').DatabaseService;
  } catch {
    FallbackDatabaseService = null;
  }
}

/**
 * Service for database backup and restore operations
 * Handles export/import of complete database data
 */
export class BackupService {
  private static instance: BackupService;
  private db: any;

  private constructor() {
    const maybeElectronDB = (typeof window !== 'undefined' && (window as any)?.electronAPI?.database)
      ? (window as any).electronAPI.database
      : null;
    this.db = maybeElectronDB || (FallbackDatabaseService ? FallbackDatabaseService.getInstance() : null);
  }

  public static getInstance(): BackupService {
    if (!BackupService.instance) {
      BackupService.instance = new BackupService();
    }
    return BackupService.instance;
  }

  // ===================
  // Database Backup
  // ===================

  /**
   * Create a complete backup of all database data
   */
  async createBackup(): Promise<string> {
    try {
      const backup = {
        version: '1.0',
        timestamp: new Date().toISOString(),
        teachers: await this.exportTeachers(),
        courses: await this.exportCourses(),
        assignments: await this.exportAssignments(),
        settings: await this.exportSettings(),
        weightingSettings: await this.exportWeightingSettings(),
        chatHistory: await this.exportChatHistory()
      };

      return JSON.stringify(backup, null, 2);
    } catch (error) {
      throw new Error(`Fehler beim Erstellen des Backups: ${error instanceof Error ? error.message : 'Unbekannter Fehler'}`);
    }
  }

  /**
   * Restore database from backup
   */
  async restoreFromBackup(backupData: string, options: { clearExisting?: boolean } = {}): Promise<void> {
    try {
      const backup = JSON.parse(backupData);

      if (!backup.version || !backup.timestamp) {
        throw new Error('Ungültiges Backup-Format');
      }

      // Clear existing data if requested
      if (options.clearExisting) {
        await this.clearAllData();
      }

      // Restore data in correct order (respecting foreign key constraints)
      if (backup.settings) {
        await this.importSettings(backup.settings);
      }

      if (backup.weightingSettings) {
        await this.importWeightingSettings(backup.weightingSettings);
      }

      if (backup.teachers) {
        await this.importTeachers(backup.teachers);
      }

      if (backup.courses) {
        await this.importCourses(backup.courses);
      }

      if (backup.assignments) {
        await this.importAssignments(backup.assignments);
      }

      if (backup.chatHistory) {
        await this.importChatHistory(backup.chatHistory);
      }

    } catch (error) {
      throw new Error(`Fehler beim Wiederherstellen des Backups: ${error instanceof Error ? error.message : 'Ungültiges Backup-Format'}`);
    }
  }

  // ===================
  // File Operations
  // ===================

  /**
   * Save backup to file
   */
  async saveBackupToFile(filePath: string): Promise<void> {
    try {
      const backupData = await this.createBackup();
      fs.writeFileSync(filePath, backupData, 'utf8');
    } catch (error) {
      throw new Error(`Fehler beim Speichern der Backup-Datei: ${error instanceof Error ? error.message : 'Unbekannter Fehler'}`);
    }
  }

  /**
   * Load backup from file
   */
  async loadBackupFromFile(filePath: string): Promise<string> {
    try {
      if (!fs.existsSync(filePath)) {
        throw new Error('Backup-Datei nicht gefunden');
      }

      return fs.readFileSync(filePath, 'utf8');
    } catch (error) {
      throw new Error(`Fehler beim Laden der Backup-Datei: ${error instanceof Error ? error.message : 'Unbekannter Fehler'}`);
    }
  }

  /**
   * Get suggested backup filename
   */
  getSuggestedBackupFilename(): string {
    const now = new Date();
    const dateStr = now.toISOString().split('T')[0]; // YYYY-MM-DD
    const timeStr = now.toTimeString().split(' ')[0].replace(/:/g, '-'); // HH-MM-SS
    return `lehrerverwaltung-backup-${dateStr}-${timeStr}.json`;
  }

  // ===================
  // Data Export Functions
  // ===================

  private async exportTeachers(): Promise<any[]> {
    const teachers = await this.dbCall<any[]>('getAllTeachers') || [];
    return teachers.map(teacher => ({
      name: teacher.name,
      qualifications: teacher.qualifications,
      working_times: teacher.working_times
    }));
  }

  private async exportCourses(): Promise<any[]> {
    const courses = await this.dbCall<any[]>('getAllCourses') || [];
    return courses.map(course => ({
      topic: course.topic,
      lessons_count: course.lessons_count,
      lesson_duration: course.lesson_duration,
      start_date: course.start_date,
      end_date: course.end_date
    }));
  }

  private async exportAssignments(): Promise<any[]> {
    const assignments = await this.dbCall<any[]>('getAllAssignments') || [];
    return Promise.all(assignments.map(async (assignment: any) => ({
      teacher_name: (await this.dbCall<any>('getTeacher', assignment.teacher_id))?.name,
      course_topic: (await this.dbCall<any>('getCourse', assignment.course_id))?.topic,
      scheduled_slots: assignment.scheduled_slots,
      status: assignment.status,
      ai_rationale: assignment.ai_rationale
    })));
  }

  private async exportSettings(): Promise<Record<string, string>> {
    return await this.dbCall<Record<string, string>>('getAllSettings') || {} as Record<string, string>;
  }

  private async exportWeightingSettings(): Promise<any[]> {
    const weightingSettings = await this.dbCall<any[]>('getWeightingPresets') || [];
    return weightingSettings.map(setting => ({
      profile_name: setting.profile_name,
      equality_weight: setting.equality_weight,
      continuity_weight: setting.continuity_weight,
      loyalty_weight: setting.loyalty_weight,
      is_default: setting.is_default
    }));
  }

  private async exportChatHistory(): Promise<any[]> {
    const conversations = await this.dbCall<any[]>('getAllChatConversations') || [];
    return Promise.all(conversations.map(async (conversation: any) => ({
      id: conversation.id,
      title: conversation.title,
      context: conversation.context,
      messages: await this.dbCall<any[]>('getChatMessages', conversation.id)
    })));
  }

  // ===================
  // Data Import Functions
  // ===================

  private async importSettings(settings: Record<string, string>): Promise<void> {
    for (const [key, value] of Object.entries(settings)) {
      await this.dbCall('setSetting', key, value);
    }
  }

  private async importWeightingSettings(weightingSettings: any[]): Promise<void> {
    for (const setting of weightingSettings) {
      await this.dbCall('saveWeightingPreset', {
        profile_name: setting.profile_name,
        equality_weight: setting.equality_weight,
        continuity_weight: setting.continuity_weight,
        loyalty_weight: setting.loyalty_weight,
        is_default: setting.is_default
      });
    }
  }

  private async importTeachers(teachers: any[]): Promise<void> {
    for (const teacher of teachers) {
      await this.dbCall('createTeacher', {
        name: teacher.name,
        qualifications: teacher.qualifications,
        working_times: teacher.working_times
      });
    }
  }

  private async importCourses(courses: any[]): Promise<void> {
    for (const course of courses) {
      await this.dbCall('createCourse', {
        topic: course.topic,
        lessons_count: course.lessons_count,
        lesson_duration: course.lesson_duration,
        start_date: course.start_date,
        end_date: course.end_date
      });
    }
  }

  private async importAssignments(assignments: any[]): Promise<void> {
    for (const assignment of assignments) {
      // Find teacher and course by name/topic
      const teachers = await this.dbCall<any[]>('getAllTeachers') || [];
      const courses = await this.dbCall<any[]>('getAllCourses') || [];

      const teacher = teachers.find(t => t.name === assignment.teacher_name);
      const course = courses.find(c => c.topic === assignment.course_topic);

      if (teacher && course) {
        await this.dbCall('createAssignment', {
          teacher_id: teacher.id,
          course_id: course.id,
          scheduled_slots: assignment.scheduled_slots,
          status: assignment.status,
          ai_rationale: assignment.ai_rationale
        });
      }
    }
  }

  private async importChatHistory(chatHistory: any[]): Promise<void> {
    for (const conversation of chatHistory) {
      // Save conversation metadata
      await this.dbCall('saveChatConversation', {
        id: conversation.id,
        title: conversation.title,
        context: conversation.context
      });

      // Save messages
      if (conversation.messages) {
        for (const message of conversation.messages) {
          await this.dbCall('saveChatMessage', {
            conversation_id: conversation.id,
            message_type: message.message_type,
            message_content: message.message_content,
            context_data: message.context_data
          });
        }
      }
    }
  }

  // ===================
  // Data Management
  // ===================

  /**
   * Clear all data from database (dangerous operation)
   */
  async clearAllData(): Promise<void> {
    try {
      // Delete in reverse order to respect foreign key constraints
      // If a raw execute method exists (main process), use it; otherwise fall back to per-entity deletion via IPC
      if (this.db && typeof this.db.execute === 'function') {
        await this.db.execute('DELETE FROM chat_history');
        await this.db.execute('DELETE FROM chat_conversations');
        await this.db.execute('DELETE FROM assignments');
        await this.db.execute('DELETE FROM courses');
        await this.db.execute('DELETE FROM teachers');
        await this.db.execute('DELETE FROM weighting_settings');
        await this.db.execute('DELETE FROM app_settings WHERE key != "settings_initialized"');
      } else {
        // Fallback: delete assignments, courses, teachers via available IPC methods
        const assignments = await this.dbCall<any[]>('getAllAssignments') || [];
        for (const a of assignments) {
          await this.dbCall('deleteAssignment', a.id);
        }
        const courses = await this.dbCall<any[]>('getAllCourses') || [];
        for (const c of courses) {
          await this.dbCall('deleteCourse', c.id);
        }
        const teachers = await this.dbCall<any[]>('getAllTeachers') || [];
        for (const t of teachers) {
          await this.dbCall('deleteTeacher', t.id);
        }
        // Settings: minimal cleanup
        const settings = await this.dbCall<Record<string, string>>('getAllSettings') || {};
        for (const key of Object.keys(settings)) {
          if (key !== 'settings_initialized') {
            await this.dbCall('setSetting', key, '');
          }
        }
      }
      console.log('All data cleared from database');
    } catch (error) {
      throw new Error(`Fehler beim Löschen der Daten: ${error instanceof Error ? error.message : 'Unbekannter Fehler'}`);
    }
  }

  /**
   * Get database statistics
   */
  async getDatabaseStats(): Promise<{
    teachers: number;
    courses: number;
    assignments: number;
    weightingPresets: number;
    chatConversations: number;
    settings: number;
  }> {
    const teachers = await this.dbCall<any[]>('getAllTeachers') || [];
    const courses = await this.dbCall<any[]>('getAllCourses') || [];
    const assignments = await this.dbCall<any[]>('getAllAssignments') || [];
    const weightingPresets = await this.dbCall<any[]>('getWeightingPresets') || [];
    const chatConversations = await this.dbCall<any[]>('getAllChatConversations') || [];
    const settings = await this.dbCall<Record<string, string>>('getAllSettings') || {};
    return {
      teachers: teachers.length,
      courses: courses.length,
      assignments: assignments.length,
      weightingPresets: weightingPresets.length,
      chatConversations: chatConversations.length,
      settings: Object.keys(settings).length
    };
  }

  // ===================
  // Validation
  // ===================

  /**
   * Validate backup file format
   */
  validateBackupFormat(backupData: string): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    try {
      const backup = JSON.parse(backupData);

      if (!backup.version) {
        errors.push('Backup-Version fehlt');
      }

      if (!backup.timestamp) {
        errors.push('Backup-Zeitstempel fehlt');
      }

      // Check for required sections
      const requiredSections = ['teachers', 'courses', 'assignments', 'settings'];
      for (const section of requiredSections) {
        if (!backup[section]) {
          errors.push(`Backup-Sektion '${section}' fehlt`);
        }
      }

    } catch (error) {
      errors.push('Ungültiges JSON-Format');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }
  // Helper that supports sync or async DB backends (main vs renderer IPC)
  private async dbCall<T = any>(method: string, ...args: any[]): Promise<T | null> {
    if (!this.db || typeof this.db[method] !== 'function') return null;
    const result = this.db[method](...args);
    if (result && typeof (result as any).then === 'function') {
      return await result;
    }
    return result as T;
  }
}
