import Papa from 'papaparse';
import { ipcMain, dialog } from 'electron';
import fs from 'fs';
import path from 'path';
import { 
  Teacher, 
  Course, 
  Assignment, 
  ImportResult, 
  ImportError,
  WorkingTimes,
  TimeRange
} from '../types';
import { DatabaseService } from './DatabaseService';
import { AnthropicService } from './AnthropicService';

export interface CSVImportOptions {
  file_path: string;
  data_type: 'teachers' | 'courses' | 'assignments';
  column_mapping: Record<string, string>;
  skip_header: boolean;
  delimiter: string;
  preview_only?: boolean;
}

export interface CSVImportPreview {
  headers: string[];
  sample_rows: string[][];
  total_rows: number;
  detected_type?: 'teachers' | 'courses' | 'assignments';
  suggested_mapping: Record<string, string>;
  ai_suggestions: string[];
}

export interface ImportProgress {
  current_row: number;
  total_rows: number;
  processed: number;
  errors: number;
  percentage: number;
}

/**
 * Service for handling file import operations, particularly CSV imports with AI assistance
 * Integrates with Electron dialog system and AnthropicService for intelligent column mapping
 */
export class FileImportService {
  private dbService: DatabaseService;
  private aiService: AnthropicService;
  private static instance: FileImportService;
  
  constructor(dbService?: DatabaseService, aiService?: AnthropicService) {
    this.dbService = dbService || DatabaseService.getInstance();
    this.aiService = aiService || new AnthropicService();
  }

  /**
   * Get singleton instance
   */
  public static getInstance(): FileImportService {
    if (!FileImportService.instance) {
      FileImportService.instance = new FileImportService();
    }
    return FileImportService.instance;
  }

  /**
   * FILE-001: Show CSV file picker dialog using Electron's native dialog
   */
  public async showFilePickerDialog(browserWindow?: any): Promise<string | null> {
    try {
      const result = await dialog.showOpenDialog(browserWindow, {
        title: 'CSV-Datei für Import auswählen',
        filters: [
          { name: 'CSV-Dateien', extensions: ['csv'] },
          { name: 'Alle Dateien', extensions: ['*'] }
        ],
        properties: ['openFile'],
        buttonLabel: 'Importieren'
      });

      if (result.canceled || !result.filePaths || result.filePaths.length === 0) {
        return null;
      }

      return result.filePaths[0];
    } catch (error) {
      console.error('Error showing file picker dialog:', error);
      throw new Error(`Datei-Dialog konnte nicht geöffnet werden: ${error}`);
    }
  }

  /**
   * FILE-002: Parse CSV file with validation using papa-parse library
   */
  public async parseCSVFile(filePath: string, options: Partial<CSVImportOptions> = {}): Promise<CSVImportPreview> {
    try {
      if (!fs.existsSync(filePath)) {
        throw new Error(`Datei nicht gefunden: ${filePath}`);
      }

      const fileContent = fs.readFileSync(filePath, 'utf8');
      // Let Papa parse auto-detect common delimiters; still pass a hint based on detection
      const delimiterHint = options.delimiter || this.detectDelimiter(fileContent);
      
      const parseResult = Papa.parse(fileContent, {
        delimiter: delimiterHint,
        delimitersToGuess: [',', ';', '\t', '|'],
        quoteChar: '"',
        escapeChar: '"',
        header: false,
        skipEmptyLines: 'greedy',
        transformHeader: (header: string) => header.trim(),
        transform: (value: string) => value.trim()
      });

      if (parseResult.errors.length > 0) {
        console.warn('CSV parsing warnings:', parseResult.errors);
      }

      const data = parseResult.data as string[][];
      
      if (data.length === 0) {
        throw new Error('CSV-Datei ist leer oder konnte nicht geparst werden');
      }

      const headers = data[0];
      const sampleRows = data.slice(1, Math.min(6, data.length)); // First 5 data rows for preview
      
      // FILE-003: Use AI for column mapping suggestion
      const aiInterpretation = await this.interpretCSVWithAI(headers, sampleRows);
      
      const preview: CSVImportPreview = {
        headers,
        sample_rows: sampleRows,
        total_rows: data.length - 1, // Excluding header
        detected_type: this.detectDataType(headers),
        suggested_mapping: aiInterpretation.columnMapping,
        ai_suggestions: aiInterpretation.suggestions
      };

      return preview;
    } catch (error) {
      console.error('Error parsing CSV file:', error);
      throw new Error(`CSV-Datei konnte nicht geparst werden: ${error}`);
    }
  }

  /**
   * FILE-003: AI-powered CSV column mapping using existing AnthropicService
   */
  private async interpretCSVWithAI(headers: string[], sampleRows: string[][]): Promise<{
    columnMapping: Record<string, string>;
    suggestions: string[];
  }> {
    try {
      const result = await this.aiService.interpretCSVData(headers, sampleRows);
      return result;
    } catch (error) {
      console.warn('AI interpretation failed, using fallback mapping:', error);
      return this.createFallbackMapping(headers);
    }
  }

  /**
   * Create fallback column mapping when AI is unavailable
   */
  private createFallbackMapping(headers: string[]): {
    columnMapping: Record<string, string>;
    suggestions: string[];
  } {
    const mapping: Record<string, string> = {};
    const suggestions: string[] = [];

    headers.forEach(header => {
      const lowerHeader = header.toLowerCase().trim();
      
      // Teacher field mappings
      if (lowerHeader.includes('name') || lowerHeader.includes('lehrer')) {
        mapping[header] = 'name';
      } else if (lowerHeader.includes('qualif') || lowerHeader.includes('fach') || lowerHeader.includes('subject')) {
        mapping[header] = 'qualifications';
      } else if (lowerHeader.includes('time') || lowerHeader.includes('zeit') || lowerHeader.includes('verfüg')) {
        mapping[header] = 'working_times';
      }
      
      // Course field mappings
      else if (lowerHeader.includes('topic') || lowerHeader.includes('thema') || lowerHeader.includes('kurs')) {
        mapping[header] = 'topic';
      } else if (lowerHeader.includes('lesson') || lowerHeader.includes('stunde') || lowerHeader.includes('anzahl')) {
        mapping[header] = 'lessons_count';
      } else if (lowerHeader.includes('duration') || lowerHeader.includes('dauer') || lowerHeader.includes('minuten')) {
        mapping[header] = 'lesson_duration';
      } else if (lowerHeader.includes('start') || lowerHeader.includes('begin')) {
        mapping[header] = 'start_date';
      } else if (lowerHeader.includes('end') || lowerHeader.includes('ende')) {
        mapping[header] = 'end_date';
      }
    });

    if (Object.keys(mapping).length === 0) {
      suggestions.push('Automatische Spaltenzuordnung konnte nicht erstellt werden. Bitte ordnen Sie die Spalten manuell zu.');
    } else {
      suggestions.push('Automatische Spaltenzuordnung basierend auf Spaltennamen erstellt. Überprüfen Sie die Zuordnungen vor dem Import.');
    }

    return { columnMapping: mapping, suggestions };
  }

  /**
   * FILE-005: Perform batch import with progress tracking
   */
  public async performBatchImport(
    options: CSVImportOptions,
    onProgress?: (progress: ImportProgress) => void
  ): Promise<ImportResult> {
    try {
      const fileContent = fs.readFileSync(options.file_path, 'utf8');
      
      const parseResult = Papa.parse(fileContent, {
        delimiter: options.delimiter || this.detectDelimiter(fileContent),
        delimitersToGuess: [',', ';', '\t', '|'],
        quoteChar: '"',
        escapeChar: '"',
        header: false,
        skipEmptyLines: 'greedy',
        transformHeader: (header: string) => header.trim(),
        transform: (value: string) => value.trim()
      });

      const data = parseResult.data as string[][];
      const headers = data[0];
      const dataRows = data.slice(options.skip_header ? 1 : 0);
      
      const result: ImportResult = {
        success: true,
        imported_count: 0,
        skipped_count: 0,
        errors: []
      };

      for (let i = 0; i < dataRows.length; i++) {
        const row = dataRows[i];
        
        // Update progress
        const progress: ImportProgress = {
          current_row: i + 1,
          total_rows: dataRows.length,
          processed: result.imported_count + result.skipped_count,
          errors: result.errors.length,
          percentage: Math.round(((i + 1) / dataRows.length) * 100)
        };
        
        onProgress?.(progress);

        try {
          const importSuccess = await this.importSingleRow(row, headers, options);
          
          if (importSuccess) {
            result.imported_count++;
          } else {
            result.skipped_count++;
          }
        } catch (error) {
          result.errors.push({
            row: i + 1,
            field: 'general',
            message: error instanceof Error ? error.message : 'Unbekannter Fehler',
            data: row
          });
        }
      }

      result.success = result.errors.length < dataRows.length / 2; // Success if less than 50% errors
      
      return result;
    } catch (error) {
      console.error('Batch import failed:', error);
      throw new Error(`Batch-Import fehlgeschlagen: ${error}`);
    }
  }

  /**
   * Import a single row of data
   */
  private async importSingleRow(
    row: string[], 
    headers: string[], 
    options: CSVImportOptions
  ): Promise<boolean> {
    const rowData: Record<string, string> = {};
    
    // Map row data using column mapping
    headers.forEach((header, index) => {
      const mappedField = options.column_mapping[header];
      if (mappedField && row[index]) {
        rowData[mappedField] = row[index];
      }
    });

    switch (options.data_type) {
      case 'teachers':
        return await this.importTeacherRow(rowData);
      case 'courses':
        return await this.importCourseRow(rowData);
      case 'assignments':
        return await this.importAssignmentRow(rowData);
      default:
        throw new Error(`Unbekannter Datentyp: ${options.data_type}`);
    }
  }

  /**
   * Import a teacher record
   */
  private async importTeacherRow(data: Record<string, string>): Promise<boolean> {
    if (!data.name || !data.qualifications) {
      return false; // Skip incomplete records
    }

    const teacher: Omit<Teacher, 'id' | 'created_at'> = {
      name: data.name,
      qualifications: this.parseQualifications(data.qualifications),
      working_times: this.parseWorkingTimes(data.working_times || '')
    };

    this.dbService.createTeacher(teacher);
    return true;
  }

  /**
   * Import a course record
   */
  private async importCourseRow(data: Record<string, string>): Promise<boolean> {
    if (!data.topic || !data.lessons_count || !data.lesson_duration) {
      return false; // Skip incomplete records
    }

    const course: Omit<Course, 'id' | 'created_at'> = {
      topic: data.topic,
      lessons_count: parseInt(data.lessons_count) || 1,
      lesson_duration: parseInt(data.lesson_duration) || 60,
      start_date: data.start_date || new Date().toISOString().split('T')[0],
      end_date: data.end_date || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
    };

    this.dbService.createCourse(course);
    return true;
  }

  /**
   * Import an assignment record
   */
  private async importAssignmentRow(data: Record<string, string>): Promise<boolean> {
    if (!data.teacher_id || !data.course_id) {
      return false; // Skip incomplete records
    }

    const assignment: Omit<Assignment, 'id' | 'created_at'> = {
      teacher_id: parseInt(data.teacher_id) || 0,
      course_id: parseInt(data.course_id) || 0,
      scheduled_slots: [],
      status: (data.status as any) || 'active',
      ai_rationale: data.ai_rationale
    };

    this.dbService.createAssignment(assignment);
    return true;
  }

  /**
   * Utility methods for parsing CSV data
   */
  private parseQualifications(qualificationsStr: string): string[] {
    if (!qualificationsStr) return [];
    
    // Handle common separators
    const separators = [',', ';', '|', '\n'];
    for (const sep of separators) {
      if (qualificationsStr.includes(sep)) {
        return qualificationsStr
          .split(sep)
          .map(q => q.trim())
          .filter(q => q.length > 0);
      }
    }
    
    return [qualificationsStr.trim()];
  }

  private parseWorkingTimes(workingTimesStr: string): WorkingTimes {
    if (!workingTimesStr) return {};
    
    try {
      // Try to parse as JSON first
      return JSON.parse(workingTimesStr);
    } catch {
      // Fallback to default working times
      const defaultTime: TimeRange = { start: '09:00', end: '17:00' };
      return {
        monday: defaultTime,
        tuesday: defaultTime,
        wednesday: defaultTime,
        thursday: defaultTime,
        friday: defaultTime
      };
    }
  }

  private detectDelimiter(content: string): string {
    const sample = content.slice(0, 1000); // First 1000 characters
    const delimiters = [',', ';', '\t', '|'];
    let maxCount = 0;
    let detectedDelimiter = ',';
    
    for (const delimiter of delimiters) {
      const count = (sample.match(new RegExp(delimiter, 'g')) || []).length;
      if (count > maxCount) {
        maxCount = count;
        detectedDelimiter = delimiter;
      }
    }
    
    return detectedDelimiter;
  }

  private detectDataType(headers: string[]): 'teachers' | 'courses' | 'assignments' | undefined {
    const lowerHeaders = headers.map(h => h.toLowerCase());
    
    // Teacher indicators
    if (lowerHeaders.some(h => h.includes('qualif') || h.includes('fach') || h.includes('working'))) {
      return 'teachers';
    }
    
    // Course indicators
    if (lowerHeaders.some(h => h.includes('topic') || h.includes('thema') || h.includes('lesson'))) {
      return 'courses';
    }
    
    // Assignment indicators
    if (lowerHeaders.some(h => h.includes('teacher_id') || h.includes('course_id') || h.includes('assignment'))) {
      return 'assignments';
    }
    
    return undefined;
  }
}

// Export singleton instance
export const fileImportService = FileImportService.getInstance();