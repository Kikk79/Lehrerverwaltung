import { dialog } from 'electron';
import fs from 'fs';
import path from 'path';
import { createEvent, createEvents } from 'ics';
import jsPDF from 'jspdf';
import Papa from 'papaparse';

import { 
  Teacher, 
  Course, 
  Assignment, 
  CalendarEvent,
  ExportOptions,
  ExportFormat,
  TimeSlot
} from '../types';
import { DatabaseService } from './DatabaseService';

export interface ExportResult {
  success: boolean;
  file_path?: string;
  error_message?: string;
  exported_count: number;
}

export interface ExportProgress {
  current_item: number;
  total_items: number;
  current_operation: string;
  percentage: number;
}

export interface SaveDialogOptions {
  title: string;
  default_filename: string;
  filters: Array<{ name: string; extensions: string[] }>;
  button_label: string;
}

/**
 * Service for handling file export operations in multiple formats
 * Supports iCal, CSV, PDF, and JSON exports with Electron dialog integration
 */
export class FileExportService {
  private dbService: DatabaseService;
  private static instance: FileExportService;

  constructor(dbService?: DatabaseService) {
    this.dbService = dbService || DatabaseService.getInstance();
  }

  /**
   * Get singleton instance
   */
  public static getInstance(): FileExportService {
    if (!FileExportService.instance) {
      FileExportService.instance = new FileExportService();
    }
    return FileExportService.instance;
  }

  /**
   * FILE-010: Show file save dialog using Electron's native dialog
   */
  public async showSaveDialog(
    options: SaveDialogOptions,
    browserWindow?: any
  ): Promise<string | null> {
    try {
      const result = await dialog.showSaveDialog(browserWindow, {
        title: options.title,
        defaultPath: options.default_filename,
        filters: options.filters,
        buttonLabel: options.button_label
      });

      if (result.canceled || !result.filePath) {
        return null;
      }

      return result.filePath;
    } catch (error) {
      console.error('Error showing save dialog:', error);
      throw new Error(`Speichern-Dialog konnte nicht geöffnet werden: ${error}`);
    }
  }

  /**
   * Main export function that dispatches to specific export handlers
   */
  public async exportData(
    exportOptions: ExportOptions,
    filePath?: string,
    onProgress?: (progress: ExportProgress) => void
  ): Promise<ExportResult> {
    try {
      // Get save path if not provided
      let savePath = filePath;
      if (!savePath) {
        const dialogOptions = this.getDialogOptionsForFormat(exportOptions.format);
        const selectedPath = await this.showSaveDialog(dialogOptions);
        
        if (!selectedPath) {
          return {
            success: false,
            error_message: 'Export abgebrochen vom Benutzer',
            exported_count: 0
          };
        }
        
        savePath = selectedPath;
      }

      // Dispatch to specific export handler
      switch (exportOptions.format) {
        case 'ical':
          return await this.exportToiCal(exportOptions, savePath, onProgress);
        case 'csv':
          return await this.exportToCSV(exportOptions, savePath, onProgress);
        case 'pdf':
          return await this.exportToPDF(exportOptions, savePath, onProgress);
        case 'json':
          return await this.exportToJSON(exportOptions, savePath, onProgress);
        default:
          throw new Error(`Nicht unterstütztes Export-Format: ${exportOptions.format}`);
      }
    } catch (error) {
      console.error('Export failed:', error);
      return {
        success: false,
        error_message: error instanceof Error ? error.message : 'Unbekannter Fehler',
        exported_count: 0
      };
    }
  }

  /**
   * FILE-006: Create iCal export functionality using 'ics' library
   */
  private async exportToiCal(
    options: ExportOptions,
    filePath: string,
    onProgress?: (progress: ExportProgress) => void
  ): Promise<ExportResult> {
    try {
      const assignments = await this.getFilteredAssignments(options);
      const calendarEvents: any[] = [];
      
      onProgress?.({
        current_item: 0,
        total_items: assignments.length,
        current_operation: 'iCal-Events erstellen',
        percentage: 0
      });

      for (let i = 0; i < assignments.length; i++) {
        const assignment = assignments[i];
        const teacher = this.dbService.getTeacher(assignment.teacher_id);
        const course = this.dbService.getCourse(assignment.course_id);
        
        if (!teacher || !course) continue;

        // Create events for each scheduled slot
        assignment.scheduled_slots.forEach(slot => {
          const startDate = new Date(`${slot.date} ${slot.start_time}`);
          const endDate = new Date(`${slot.date} ${slot.end_time}`);
          
          calendarEvents.push({
            title: `${course.topic} - ${teacher.name}`,
            description: `Kurs: ${course.topic}\nLehrer: ${teacher.name}\nDauer: ${slot.duration_minutes} Minuten${assignment.ai_rationale ? `\nAI-Begründung: ${assignment.ai_rationale}` : ''}`,
            start: [
              startDate.getFullYear(),
              startDate.getMonth() + 1,
              startDate.getDate(),
              startDate.getHours(),
              startDate.getMinutes()
            ],
            end: [
              endDate.getFullYear(),
              endDate.getMonth() + 1,
              endDate.getDate(),
              endDate.getHours(),
              endDate.getMinutes()
            ],
            categories: [course.topic, 'Unterricht'],
            status: 'CONFIRMED',
            organizer: { name: teacher.name },
            uid: `assignment-${assignment.id}-${slot.date}-${slot.start_time}`
          });
        });

        onProgress?.({
          current_item: i + 1,
          total_items: assignments.length,
          current_operation: `Verarbeite ${teacher.name} - ${course.topic}`,
          percentage: Math.round(((i + 1) / assignments.length) * 100)
        });
      }

      // Generate iCal content
      const { error, value } = createEvents(calendarEvents);
      
      if (error) {
        throw new Error(`iCal-Erstellung fehlgeschlagen: ${error}`);
      }

      // Write to file
      fs.writeFileSync(filePath, value!, 'utf8');

      return {
        success: true,
        file_path: filePath,
        exported_count: calendarEvents.length
      };
    } catch (error) {
      console.error('iCal export failed:', error);
      throw new Error(`iCal-Export fehlgeschlagen: ${error}`);
    }
  }

  /**
   * FILE-007: Implement CSV export for assignments
   */
  private async exportToCSV(
    options: ExportOptions,
    filePath: string,
    onProgress?: (progress: ExportProgress) => void
  ): Promise<ExportResult> {
    try {
      const data: any[] = [];
      let totalItems = 0;

      // Collect data based on options
      if (options.include_teachers) {
        const teachers = this.dbService.getAllTeachers();
        totalItems += teachers.length;
        
        teachers.forEach(teacher => {
          data.push({
            type: 'Teacher',
            id: teacher.id,
            name: teacher.name,
            qualifications: teacher.qualifications.join(', '),
            working_times: JSON.stringify(teacher.working_times),
            created_at: teacher.created_at
          });
        });
      }

      if (options.include_courses) {
        const courses = this.dbService.getAllCourses();
        totalItems += courses.length;
        
        courses.forEach(course => {
          data.push({
            type: 'Course',
            id: course.id,
            topic: course.topic,
            lessons_count: course.lessons_count,
            lesson_duration: course.lesson_duration,
            start_date: course.start_date,
            end_date: course.end_date,
            created_at: course.created_at
          });
        });
      }

      if (options.include_assignments) {
        const assignments = await this.getFilteredAssignments(options);
        totalItems += assignments.length;
        
        assignments.forEach(assignment => {
          const teacher = this.dbService.getTeacher(assignment.teacher_id);
          const course = this.dbService.getCourse(assignment.course_id);
          
          data.push({
            type: 'Assignment',
            id: assignment.id,
            teacher_id: assignment.teacher_id,
            teacher_name: teacher?.name || 'Unknown',
            course_id: assignment.course_id,
            course_topic: course?.topic || 'Unknown',
            scheduled_slots: JSON.stringify(assignment.scheduled_slots),
            status: assignment.status,
            ai_rationale: assignment.ai_rationale || '',
            created_at: assignment.created_at
          });
        });
      }

      onProgress?.({
        current_item: data.length,
        total_items: totalItems,
        current_operation: 'CSV-Datei generieren',
        percentage: 100
      });

      // Generate CSV content
      const csv = Papa.unparse(data, {
        delimiter: ';',
        header: true,
        quotes: true
      });

      // Write to file
      fs.writeFileSync(filePath, csv, 'utf8');

      return {
        success: true,
        file_path: filePath,
        exported_count: data.length
      };
    } catch (error) {
      console.error('CSV export failed:', error);
      throw new Error(`CSV-Export fehlgeschlagen: ${error}`);
    }
  }

  /**
   * FILE-008: Add PDF export for calendar views using jsPDF
   */
  private async exportToPDF(
    options: ExportOptions,
    filePath: string,
    onProgress?: (progress: ExportProgress) => void
  ): Promise<ExportResult> {
    try {
      const assignments = await this.getFilteredAssignments(options);
      const doc = new jsPDF();

      onProgress?.({
        current_item: 0,
        total_items: assignments.length,
        current_operation: 'PDF erstellen',
        percentage: 0
      });

      // PDF Title
      doc.setFontSize(20);
      doc.text('Lehrer-Kurs Zuweisungen', 20, 30);
      
      // Current date
      doc.setFontSize(10);
      doc.text(`Erstellt am: ${new Date().toLocaleDateString('de-DE')}`, 20, 40);

      let yPosition = 60;
      const lineHeight = 8;
      const maxYPosition = 280;

      // Group assignments by teacher
      const assignmentsByTeacher = this.groupAssignmentsByTeacher(assignments);
      let processedCount = 0;

      for (const [teacherId, teacherAssignments] of assignmentsByTeacher.entries()) {
        const teacher = this.dbService.getTeacher(parseInt(teacherId));
        if (!teacher) continue;

        // Check if we need a new page
        if (yPosition > maxYPosition) {
          doc.addPage();
          yPosition = 30;
        }

        // Teacher header
        doc.setFontSize(14);
        doc.text(`Lehrer: ${teacher.name}`, 20, yPosition);
        yPosition += lineHeight + 2;

        doc.setFontSize(10);
        doc.text(`Qualifikationen: ${teacher.qualifications.join(', ')}`, 30, yPosition);
        yPosition += lineHeight;

        // Assignments for this teacher
        teacherAssignments.forEach(assignment => {
          const course = this.dbService.getCourse(assignment.course_id);
          if (!course) return;

          if (yPosition > maxYPosition) {
            doc.addPage();
            yPosition = 30;
          }

          doc.setFontSize(10);
          doc.text(`• ${course.topic}`, 30, yPosition);
          yPosition += lineHeight;

          doc.setFontSize(8);
          doc.text(`  ${course.lessons_count} Lektionen à ${course.lesson_duration} Min`, 40, yPosition);
          yPosition += lineHeight;

          doc.text(`  ${course.start_date} bis ${course.end_date}`, 40, yPosition);
          yPosition += lineHeight;

          if (assignment.ai_rationale) {
            const rationale = assignment.ai_rationale.length > 80 
              ? assignment.ai_rationale.substring(0, 80) + '...'
              : assignment.ai_rationale;
            doc.text(`  AI-Begründung: ${rationale}`, 40, yPosition);
            yPosition += lineHeight;
          }

          yPosition += 2; // Extra spacing
        });

        yPosition += lineHeight; // Extra spacing between teachers
        processedCount += teacherAssignments.length;

        onProgress?.({
          current_item: processedCount,
          total_items: assignments.length,
          current_operation: `Verarbeite ${teacher.name}`,
          percentage: Math.round((processedCount / assignments.length) * 100)
        });
      }

      // Statistics page
      doc.addPage();
      doc.setFontSize(16);
      doc.text('Statistiken', 20, 30);

      doc.setFontSize(10);
      yPosition = 50;
      doc.text(`Gesamte Zuweisungen: ${assignments.length}`, 20, yPosition);
      yPosition += lineHeight;
      doc.text(`Anzahl Lehrer: ${assignmentsByTeacher.size}`, 20, yPosition);
      yPosition += lineHeight;

      const uniqueCourses = new Set(assignments.map(a => a.course_id));
      doc.text(`Anzahl Kurse: ${uniqueCourses.size}`, 20, yPosition);

      // Save PDF
      doc.save(filePath);

      return {
        success: true,
        file_path: filePath,
        exported_count: assignments.length
      };
    } catch (error) {
      console.error('PDF export failed:', error);
      throw new Error(`PDF-Export fehlgeschlagen: ${error}`);
    }
  }

  /**
   * Export to JSON format
   */
  private async exportToJSON(
    options: ExportOptions,
    filePath: string,
    onProgress?: (progress: ExportProgress) => void
  ): Promise<ExportResult> {
    try {
      const exportData: any = {
        export_date: new Date().toISOString(),
        options: options
      };

      if (options.include_teachers) {
        exportData.teachers = this.dbService.getAllTeachers();
      }

      if (options.include_courses) {
        exportData.courses = this.dbService.getAllCourses();
      }

      if (options.include_assignments) {
        exportData.assignments = await this.getFilteredAssignments(options);
        
        // Enrich assignments with teacher and course names
        exportData.assignments = exportData.assignments.map((assignment: Assignment) => {
          const teacher = this.dbService.getTeacher(assignment.teacher_id);
          const course = this.dbService.getCourse(assignment.course_id);
          
          return {
            ...assignment,
            teacher_name: teacher?.name || 'Unknown',
            course_topic: course?.topic || 'Unknown'
          };
        });
      }

      onProgress?.({
        current_item: 1,
        total_items: 1,
        current_operation: 'JSON-Datei schreiben',
        percentage: 100
      });

      // Write to file
      const jsonContent = JSON.stringify(exportData, null, 2);
      fs.writeFileSync(filePath, jsonContent, 'utf8');

      const totalItems = (exportData.teachers?.length || 0) + 
                        (exportData.courses?.length || 0) + 
                        (exportData.assignments?.length || 0);

      return {
        success: true,
        file_path: filePath,
        exported_count: totalItems
      };
    } catch (error) {
      console.error('JSON export failed:', error);
      throw new Error(`JSON-Export fehlgeschlagen: ${error}`);
    }
  }

  /**
   * Helper methods
   */
  private async getFilteredAssignments(options: ExportOptions): Promise<Assignment[]> {
    let assignments = this.dbService.getAllAssignments();

    // Apply date range filter if specified
    if (options.date_range) {
      const startDate = new Date(options.date_range.start);
      const endDate = new Date(options.date_range.end);
      
      assignments = assignments.filter(assignment => {
        return assignment.scheduled_slots.some(slot => {
          const slotDate = new Date(slot.date);
          return slotDate >= startDate && slotDate <= endDate;
        });
      });
    }

    return assignments;
  }

  private groupAssignmentsByTeacher(assignments: Assignment[]): Map<string, Assignment[]> {
    const grouped = new Map<string, Assignment[]>();
    
    assignments.forEach(assignment => {
      const teacherId = assignment.teacher_id.toString();
      if (!grouped.has(teacherId)) {
        grouped.set(teacherId, []);
      }
      grouped.get(teacherId)!.push(assignment);
    });

    return grouped;
  }

  private getDialogOptionsForFormat(format: ExportFormat): SaveDialogOptions {
    switch (format) {
      case 'ical':
        return {
          title: 'Kalender exportieren (iCal)',
          default_filename: `zuweisungen-${new Date().toISOString().split('T')[0]}.ics`,
          filters: [
            { name: 'iCal-Dateien', extensions: ['ics'] },
            { name: 'Alle Dateien', extensions: ['*'] }
          ],
          button_label: 'Exportieren'
        };
      case 'csv':
        return {
          title: 'Daten exportieren (CSV)',
          default_filename: `export-${new Date().toISOString().split('T')[0]}.csv`,
          filters: [
            { name: 'CSV-Dateien', extensions: ['csv'] },
            { name: 'Alle Dateien', extensions: ['*'] }
          ],
          button_label: 'Exportieren'
        };
      case 'pdf':
        return {
          title: 'Bericht exportieren (PDF)',
          default_filename: `bericht-${new Date().toISOString().split('T')[0]}.pdf`,
          filters: [
            { name: 'PDF-Dateien', extensions: ['pdf'] },
            { name: 'Alle Dateien', extensions: ['*'] }
          ],
          button_label: 'Exportieren'
        };
      case 'json':
        return {
          title: 'Daten exportieren (JSON)',
          default_filename: `backup-${new Date().toISOString().split('T')[0]}.json`,
          filters: [
            { name: 'JSON-Dateien', extensions: ['json'] },
            { name: 'Alle Dateien', extensions: ['*'] }
          ],
          button_label: 'Exportieren'
        };
      default:
        return {
          title: 'Datei exportieren',
          default_filename: 'export.txt',
          filters: [{ name: 'Alle Dateien', extensions: ['*'] }],
          button_label: 'Exportieren'
        };
    }
  }
}

// Export singleton instance
export const fileExportService = FileExportService.getInstance();