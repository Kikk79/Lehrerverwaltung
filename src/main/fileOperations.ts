import { ipcMain, BrowserWindow } from 'electron';
import { 
  FileImportService, 
  CSVImportOptions, 
  CSVImportPreview, 
  ImportProgress 
} from '../shared/services/FileImportService';
import { 
  FileExportService, 
  ExportResult, 
  ExportProgress, 
  SaveDialogOptions 
} from '../shared/services/FileExportService';
import { ExportOptions, ImportResult } from '../shared/types';
import { DatabaseService } from '../shared/services/DatabaseService';
import { AnthropicService } from '../shared/services/AnthropicService';

/**
 * Main process file operations handler
 * Sets up IPC handlers for file import/export operations
 */
export class MainFileOperationsHandler {
  private fileImportService: FileImportService;
  private fileExportService: FileExportService;
  private dbService: DatabaseService;
  private aiService: AnthropicService;

  constructor(dbService: DatabaseService, aiService: AnthropicService) {
    this.dbService = dbService;
    this.aiService = aiService;
    this.fileImportService = new FileImportService(dbService, aiService);
    this.fileExportService = new FileExportService(dbService);
    this.setupIpcHandlers();
  }

  /**
   * Set up IPC handlers for file operations
   */
  private setupIpcHandlers(): void {
    // FILE IMPORT OPERATIONS

    /**
     * FILE-001: Show file picker dialog for CSV import
     */
    ipcMain.handle('fileImport:showFilePickerDialog', async () => {
      const focusedWindow = BrowserWindow.getFocusedWindow();
      return await this.fileImportService.showFilePickerDialog(focusedWindow);
    });

    /**
     * FILE-002: Parse CSV file with validation
     */
    ipcMain.handle('fileImport:parseCSVFile', async (_, filePath: string, options?: Partial<CSVImportOptions>): Promise<CSVImportPreview> => {
      return await this.fileImportService.parseCSVFile(filePath, options);
    });

    /**
     * FILE-005: Perform batch import with progress tracking
     */
    ipcMain.handle('fileImport:performBatchImport', async (
      _, 
      options: CSVImportOptions, 
      onProgressCallback?: (progress: ImportProgress) => void
    ): Promise<ImportResult> => {
      return new Promise((resolve, reject) => {
        // Create a progress handler that sends updates to renderer
        const progressHandler = (progress: ImportProgress) => {
          // Send progress update to renderer
          const focusedWindow = BrowserWindow.getFocusedWindow();
          if (focusedWindow) {
            focusedWindow.webContents.send('fileImport:progress', progress);
          }
          
          // Also call the callback if provided
          onProgressCallback?.(progress);
        };

        this.fileImportService.performBatchImport(options, progressHandler)
          .then(resolve)
          .catch(reject);
      });
    });

    // FILE EXPORT OPERATIONS

    /**
     * FILE-010: Show save dialog for file export
     */
    ipcMain.handle('fileExport:showSaveDialog', async (_, options: SaveDialogOptions) => {
      const focusedWindow = BrowserWindow.getFocusedWindow();
      return await this.fileExportService.showSaveDialog(options, focusedWindow);
    });

    /**
     * Main export function with all formats (FILE-006, FILE-007, FILE-008)
     */
    ipcMain.handle('fileExport:exportData', async (
      _, 
      exportOptions: ExportOptions, 
      filePath?: string, 
      onProgressCallback?: (progress: ExportProgress) => void
    ): Promise<ExportResult> => {
      return new Promise((resolve, reject) => {
        // Create a progress handler that sends updates to renderer
        const progressHandler = (progress: ExportProgress) => {
          // Send progress update to renderer
          const focusedWindow = BrowserWindow.getFocusedWindow();
          if (focusedWindow) {
            focusedWindow.webContents.send('fileExport:progress', progress);
          }
          
          // Also call the callback if provided
          onProgressCallback?.(progress);
        };

        this.fileExportService.exportData(exportOptions, filePath, progressHandler)
          .then(resolve)
          .catch(reject);
      });
    });

    // CONVENIENCE METHODS FOR SPECIFIC EXPORT FORMATS

    /**
     * FILE-006: Quick iCal export
     */
    ipcMain.handle('fileExport:exportToiCal', async (_, options: ExportOptions, filePath?: string) => {
      const exportOptions = { ...options, format: 'ical' as const };
      return await this.fileExportService.exportData(exportOptions, filePath);
    });

    /**
     * FILE-007: Quick CSV export
     */
    ipcMain.handle('fileExport:exportToCSV', async (_, options: ExportOptions, filePath?: string) => {
      const exportOptions = { ...options, format: 'csv' as const };
      return await this.fileExportService.exportData(exportOptions, filePath);
    });

    /**
     * FILE-008: Quick PDF export
     */
    ipcMain.handle('fileExport:exportToPDF', async (_, options: ExportOptions, filePath?: string) => {
      const exportOptions = { ...options, format: 'pdf' as const };
      return await this.fileExportService.exportData(exportOptions, filePath);
    });

    /**
     * Quick JSON export for backups
     */
    ipcMain.handle('fileExport:exportToJSON', async (_, options: ExportOptions, filePath?: string) => {
      const exportOptions = { ...options, format: 'json' as const };
      return await this.fileExportService.exportData(exportOptions, filePath);
    });

    // UTILITY METHODS

    /**
     * Get available export formats
     */
    ipcMain.handle('fileExport:getAvailableFormats', async () => {
      return ['ical', 'csv', 'pdf', 'json'];
    });

    /**
     * Validate export options before processing
     */
    ipcMain.handle('fileExport:validateExportOptions', async (_, options: ExportOptions) => {
      // Basic validation
      if (!options.format) {
        return { valid: false, error: 'Export-Format ist erforderlich' };
      }

      if (!options.include_assignments && !options.include_teachers && !options.include_courses) {
        return { valid: false, error: 'Mindestens eine Datenquelle muss ausgewählt werden' };
      }

      if (options.date_range && options.date_range.start > options.date_range.end) {
        return { valid: false, error: 'Startdatum muss vor dem Enddatum liegen' };
      }

      return { valid: true };
    });

    /**
     * Get file operation statistics
     */
    ipcMain.handle('fileOperations:getStats', async () => {
      return {
        import_service_available: !!this.fileImportService,
        export_service_available: !!this.fileExportService,
        ai_service_available: !!this.aiService,
        supported_import_formats: ['csv'],
        supported_export_formats: ['ical', 'csv', 'pdf', 'json']
      };
    });

    // ERROR HANDLING AND LOGGING

    /**
     * Handle import errors
     */
    ipcMain.handle('fileImport:handleError', async (_, error: any) => {
      console.error('File import error:', error);
      return {
        handled: true,
        user_message: `Import-Fehler: ${error.message || 'Unbekannter Fehler'}`,
        technical_details: error.stack || error.toString()
      };
    });

    /**
     * Handle export errors
     */
    ipcMain.handle('fileExport:handleError', async (_, error: any) => {
      console.error('File export error:', error);
      return {
        handled: true,
        user_message: `Export-Fehler: ${error.message || 'Unbekannter Fehler'}`,
        technical_details: error.stack || error.toString()
      };
    });
  }

  /**
   * Get file import service instance for direct access in main process
   */
  public getFileImportService(): FileImportService {
    return this.fileImportService;
  }

  /**
   * Get file export service instance for direct access in main process
   */
  public getFileExportService(): FileExportService {
    return this.fileExportService;
  }

  /**
   * Initialize services with AI configuration if needed
   */
  public async initializeServices(): Promise<void> {
    try {
      // Initialize AI service if not already initialized
      const envKey = process.env.ANTHROPIC_API_KEY?.trim();

      // Fallback to DB-stored key (supports both anthropic_api_key and ai_api_key)
      let storedKey = this.dbService.getSetting('anthropic_api_key') || this.dbService.getSetting('ai_api_key');
      // SettingsService stores base64 to avoid plaintext; decode if it looks like base64
      let decodedKey: string | null = null;
      if (storedKey) {
        try {
          const maybe = Buffer.from(storedKey, 'base64').toString('utf8');
          // Heuristic: Anthropic keys start with "sk-ant-"; if decode yields that, use it
          decodedKey = maybe.startsWith('sk-ant-') ? maybe : storedKey;
        } catch {
          decodedKey = storedKey;
        }
      }

      const apiKey = envKey || decodedKey || null;

      if (apiKey && !this.aiService.getConfig()) {
        // Respect user-selected model; fall back to Sonnet if none
        const selectedModelRaw = this.dbService.getSetting('selected_ai_model') || 'claude-sonnet-4-20250514';
        const allowed: any = ['claude-haiku-3.5-20241022','claude-sonnet-4-20250514','claude-opus-4-20241022'];
        const selectedModel = (allowed.includes(selectedModelRaw) ? selectedModelRaw : 'claude-sonnet-4-20250514') as any;
        await this.aiService.initialize({
          apiKey,
          model: selectedModel,
          maxTokens: 1000,
          temperature: 0.1,
          systemPrompt: 'You are a helpful CSV interpretation assistant.'
        });
      }
    } catch (error) {
      console.error('Failed to initialize file operation services:', error);
    }
  }

  /**
   * Cleanup resources
   */
  public cleanup(): void {
    // No specific cleanup needed for current implementation
    // Services will be garbage collected when this handler is destroyed
  }
}