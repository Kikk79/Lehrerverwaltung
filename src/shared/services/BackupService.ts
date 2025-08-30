import { DatabaseService } from './DatabaseService';
import fs from 'fs';
import path from 'path';

/**
 * Service for database backup and restore operations
 * Handles export/import of complete database data
 */
export class BackupService {
  private static instance: BackupService;
  private databaseService: DatabaseService;

  private constructor() {
    this.databaseService = DatabaseService.getInstance();
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
    const teachers = this.databaseService.getAllTeachers();
    return teachers.map(teacher => ({
      name: teacher.name,
      qualifications: teacher.qualifications,
      working_times: teacher.working_times
    }));
  }

  private async exportCourses(): Promise<any[]> {
    const courses = this.databaseService.getAllCourses();
    return courses.map(course => ({
      topic: course.topic,
      lessons_count: course.lessons_count,
      lesson_duration: course.lesson_duration,
      start_date: course.start_date,
      end_date: course.end_date
    }));
  }

  private async exportAssignments(): Promise<any[]> {
    const assignments = this.databaseService.getAllAssignments();
    return assignments.map(assignment => ({
      teacher_name: this.databaseService.getTeacher(assignment.teacher_id)?.name,
      course_topic: this.databaseService.getCourse(assignment.course_id)?.topic,
      scheduled_slots: assignment.scheduled_slots,
      status: assignment.status,
      ai_rationale: assignment.ai_rationale
    }));
  }

  private async exportSettings(): Promise<Record<string, string>> {
    return this.databaseService.getAllSettings();
  }

  private async exportWeightingSettings(): Promise<any[]> {
    const weightingSettings = this.databaseService.getWeightingPresets();
    return weightingSettings.map(setting => ({
      profile_name: setting.profile_name,
      equality_weight: setting.equality_weight,
      continuity_weight: setting.continuity_weight,
      loyalty_weight: setting.loyalty_weight,
      is_default: setting.is_default
    }));
  }

  private async exportChatHistory(): Promise<any[]> {
    const conversations = this.databaseService.getAllChatConversations();
    return conversations.map(conversation => ({
      id: conversation.id,
      title: conversation.title,
      context: conversation.context,
      messages: this.databaseService.getChatMessages(conversation.id)
    }));
  }

  // ===================
  // Data Import Functions
  // ===================

  private async importSettings(settings: Record<string, string>): Promise<void> {
    for (const [key, value] of Object.entries(settings)) {
      this.databaseService.setSetting(key, value);
    }
  }

  private async importWeightingSettings(weightingSettings: any[]): Promise<void> {
    for (const setting of weightingSettings) {
      this.databaseService.saveWeightingPreset({
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
      this.databaseService.createTeacher({
        name: teacher.name,
        qualifications: teacher.qualifications,
        working_times: teacher.working_times
      });
    }
  }

  private async importCourses(courses: any[]): Promise<void> {
    for (const course of courses) {
      this.databaseService.createCourse({
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
      const teachers = this.databaseService.getAllTeachers();
      const courses = this.databaseService.getAllCourses();

      const teacher = teachers.find(t => t.name === assignment.teacher_name);
      const course = courses.find(c => c.topic === assignment.course_topic);

      if (teacher && course) {
        this.databaseService.createAssignment({
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
      this.databaseService.saveChatConversation({
        id: conversation.id,
        title: conversation.title,
        context: conversation.context
      });

      // Save messages
      if (conversation.messages) {
        for (const message of conversation.messages) {
          this.databaseService.saveChatMessage({
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
      this.databaseService.execute('DELETE FROM chat_history');
      this.databaseService.execute('DELETE FROM chat_conversations');
      this.databaseService.execute('DELETE FROM assignments');
      this.databaseService.execute('DELETE FROM courses');
      this.databaseService.execute('DELETE FROM teachers');
      this.databaseService.execute('DELETE FROM weighting_settings');
      this.databaseService.execute('DELETE FROM app_settings WHERE key != "settings_initialized"');
      
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
    return {
      teachers: this.databaseService.getAllTeachers().length,
      courses: this.databaseService.getAllCourses().length,
      assignments: this.databaseService.getAllAssignments().length,
      weightingPresets: this.databaseService.getWeightingPresets().length,
      chatConversations: this.databaseService.getAllChatConversations().length,
      settings: Object.keys(this.databaseService.getAllSettings()).length
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
}