import { DatabaseService } from '../shared/services/DatabaseService';
import { AssignmentService, AssignmentWeights } from '../shared/services/AssignmentService';
import { app, ipcMain } from 'electron';
import path from 'path';
import fs from 'fs';
import { Teacher, Course, Assignment, AssignmentConstraints } from '../shared/types';

/**
 * Main process database handler
 * Sets up IPC handlers for database operations
 */
export class MainDatabaseHandler {
  private dbService: DatabaseService;
  private assignmentService: AssignmentService;

  constructor() {
    const userDataDir = path.join(app.getPath('userData'), 'database');
    const dbPath = path.join(userDataDir, 'teacher-assignment.db');

    // Attempt one-time migration from legacy repo path to userData path
    try {
      const legacyDir = path.join(process.cwd(), 'database');
      const legacyDb = path.join(legacyDir, 'teacher-assignment.db');
      if (!fs.existsSync(userDataDir)) {
        fs.mkdirSync(userDataDir, { recursive: true });
      }
      if (!fs.existsSync(dbPath) && fs.existsSync(legacyDb)) {
        fs.copyFileSync(legacyDb, dbPath);
        const legacyWal = legacyDb + '-wal';
        const legacyShm = legacyDb + '-shm';
        if (fs.existsSync(legacyWal)) {
          const walTarget = path.join(userDataDir, 'teacher-assignment.db-wal');
          fs.copyFileSync(legacyWal, walTarget);
        }
        if (fs.existsSync(legacyShm)) {
          const shmTarget = path.join(userDataDir, 'teacher-assignment.db-shm');
          fs.copyFileSync(legacyShm, shmTarget);
        }
        console.log('[main] Migrated database to userData path:', dbPath);
      }
    } catch (err) {
      console.warn('[main] Database migration skipped or failed:', err);
    }

    this.dbService = DatabaseService.getInstance(dbPath);
    this.assignmentService = new AssignmentService(this.dbService);
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

    // Weighting settings operations (exposed for renderer)
    ipcMain.handle('db:getWeightingPresets', async () => {
      return this.dbService.getWeightingPresets();
    });

    ipcMain.handle('db:saveWeightingPreset', async (_evt, preset) => {
      return this.dbService.saveWeightingPreset(preset);
    });

    ipcMain.handle('db:deleteWeightingPreset', async (_evt, id: number) => {
      return this.dbService.deleteWeightingPreset(id);
    });

    ipcMain.handle('db:getDefaultWeightingSettings', async () => {
      return this.dbService.getDefaultWeightingSettings();
    });

    ipcMain.handle('db:getAllWeightingSettings', async () => {
      return this.dbService.getAllWeightingSettings();
    });

    ipcMain.handle('db:updateWeightingSettings', async (_evt, id: number, updates) => {
      return this.dbService.updateWeightingSettings(id, updates);
    });

    ipcMain.handle('db:setDefaultWeightingPreset', async (_evt, id: number) => {
      return this.dbService.setDefaultWeightingPreset(id);
    });

    // Assignment generation operations
    ipcMain.handle('assignment:generate', async (_, weights?: AssignmentWeights, constraints?: AssignmentConstraints) => {
      return this.assignmentService.generateAssignments(weights, constraints);
    });

    ipcMain.handle('assignment:getQualificationMatches', async () => {
      const teachers = this.dbService.getAllTeachers();
      const courses = this.dbService.getAllCourses();
      return this.assignmentService.getQualificationMatches(courses, teachers);
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