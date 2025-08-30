import { DatabaseService } from '../shared/services/DatabaseService';
import { ipcMain } from 'electron';
import { Teacher, Course, Assignment } from '../shared/types';

/**
 * Main process database handler
 * Sets up IPC handlers for database operations
 */
export class MainDatabaseHandler {
  private dbService: DatabaseService;

  constructor() {
    this.dbService = DatabaseService.getInstance();
    this.setupIpcHandlers();
  }

  /**
   * Set up IPC handlers for database operations
   */
  private setupIpcHandlers(): void {
    // Teacher operations
    ipcMain.handle('db:createTeacher', async (_, teacher: Omit<Teacher, 'id' | 'created_at'>) => {
      return this.dbService.createTeacher(teacher);
    });

    ipcMain.handle('db:getTeacher', async (_, id: number) => {
      return this.dbService.getTeacher(id);
    });

    ipcMain.handle('db:getAllTeachers', async () => {
      return this.dbService.getAllTeachers();
    });

    ipcMain.handle('db:updateTeacher', async (_, id: number, updates: Partial<Omit<Teacher, 'id' | 'created_at'>>) => {
      return this.dbService.updateTeacher(id, updates);
    });

    ipcMain.handle('db:deleteTeacher', async (_, id: number) => {
      return this.dbService.deleteTeacher(id);
    });

    // Course operations
    ipcMain.handle('db:createCourse', async (_, course: Omit<Course, 'id' | 'created_at'>) => {
      return this.dbService.createCourse(course);
    });

    ipcMain.handle('db:getCourse', async (_, id: number) => {
      return this.dbService.getCourse(id);
    });

    ipcMain.handle('db:getAllCourses', async () => {
      return this.dbService.getAllCourses();
    });

    ipcMain.handle('db:updateCourse', async (_, id: number, updates: Partial<Omit<Course, 'id' | 'created_at'>>) => {
      return this.dbService.updateCourse(id, updates);
    });

    ipcMain.handle('db:deleteCourse', async (_, id: number) => {
      return this.dbService.deleteCourse(id);
    });

    // Assignment operations
    ipcMain.handle('db:createAssignment', async (_, assignment: Omit<Assignment, 'id' | 'created_at'>) => {
      return this.dbService.createAssignment(assignment);
    });

    ipcMain.handle('db:getAssignment', async (_, id: number) => {
      return this.dbService.getAssignment(id);
    });

    ipcMain.handle('db:getAllAssignments', async () => {
      return this.dbService.getAllAssignments();
    });

    ipcMain.handle('db:updateAssignment', async (_, id: number, updates: Partial<Omit<Assignment, 'id' | 'created_at'>>) => {
      return this.dbService.updateAssignment(id, updates);
    });

    ipcMain.handle('db:deleteAssignment', async (_, id: number) => {
      return this.dbService.deleteAssignment(id);
    });

    // Settings operations
    ipcMain.handle('db:getSetting', async (_, key: string) => {
      return this.dbService.getSetting(key);
    });

    ipcMain.handle('db:setSetting', async (_, key: string, value: string) => {
      return this.dbService.setSetting(key, value);
    });

    ipcMain.handle('db:getAllSettings', async () => {
      return this.dbService.getAllSettings();
    });

    // Utility operations
    ipcMain.handle('db:getStats', async () => {
      return this.dbService.getStats();
    });
  }

  /**
   * Get database service instance for direct access in main process
   */
  public getDatabaseService(): DatabaseService {
    return this.dbService;
  }

  /**
   * Close database connection
   */
  public close(): void {
    this.dbService.close();
  }
}