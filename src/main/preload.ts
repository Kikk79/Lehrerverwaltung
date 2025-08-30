import { contextBridge, ipcRenderer } from 'electron';
import { Teacher, Course, Assignment, ExportOptions } from '../shared/types';
import { CSVImportOptions } from '../shared/services/FileImportService';
import { SaveDialogOptions } from '../shared/services/FileExportService';

const electronAPI = {
  getVersion: () => ipcRenderer.invoke('app:getVersion'),
  getPlatform: () => ipcRenderer.invoke('app:getPlatform'),
  quit: () => ipcRenderer.invoke('app:quit'),
  
  onUpdateAvailable: (callback: () => void) => {
    ipcRenderer.on('update:available', callback);
    return () => ipcRenderer.removeListener('update:available', callback);
  },
  
  onUpdateDownloaded: (callback: () => void) => {
    ipcRenderer.on('update:downloaded', callback);
    return () => ipcRenderer.removeListener('update:downloaded', callback);
  },

  // Database operations
  database: {
    // Teacher operations
    createTeacher: (teacher: Omit<Teacher, 'id' | 'created_at'>) => ipcRenderer.invoke('db:createTeacher', teacher),
    getTeacher: (id: number) => ipcRenderer.invoke('db:getTeacher', id),
    getAllTeachers: () => ipcRenderer.invoke('db:getAllTeachers'),
    updateTeacher: (id: number, updates: Partial<Omit<Teacher, 'id' | 'created_at'>>) => 
      ipcRenderer.invoke('db:updateTeacher', id, updates),
    deleteTeacher: (id: number) => ipcRenderer.invoke('db:deleteTeacher', id),

    // Course operations
    createCourse: (course: Omit<Course, 'id' | 'created_at'>) => ipcRenderer.invoke('db:createCourse', course),
    getCourse: (id: number) => ipcRenderer.invoke('db:getCourse', id),
    getAllCourses: () => ipcRenderer.invoke('db:getAllCourses'),
    updateCourse: (id: number, updates: Partial<Omit<Course, 'id' | 'created_at'>>) => 
      ipcRenderer.invoke('db:updateCourse', id, updates),
    deleteCourse: (id: number) => ipcRenderer.invoke('db:deleteCourse', id),

    // Assignment operations
    createAssignment: (assignment: Omit<Assignment, 'id' | 'created_at'>) => 
      ipcRenderer.invoke('db:createAssignment', assignment),
    getAssignment: (id: number) => ipcRenderer.invoke('db:getAssignment', id),
    getAllAssignments: () => ipcRenderer.invoke('db:getAllAssignments'),
    updateAssignment: (id: number, updates: Partial<Omit<Assignment, 'id' | 'created_at'>>) => 
      ipcRenderer.invoke('db:updateAssignment', id, updates),
    deleteAssignment: (id: number) => ipcRenderer.invoke('db:deleteAssignment', id),

    // Settings operations
    getSetting: (key: string) => ipcRenderer.invoke('db:getSetting', key),
    setSetting: (key: string, value: string) => ipcRenderer.invoke('db:setSetting', key, value),
    getAllSettings: () => ipcRenderer.invoke('db:getAllSettings'),

    // Utility operations
    getStats: () => ipcRenderer.invoke('db:getStats')
  },

  // File Import operations
  fileImport: {
    showFilePickerDialog: () => ipcRenderer.invoke('fileImport:showFilePickerDialog'),
    parseCSVFile: (filePath: string, options?: Partial<CSVImportOptions>) => 
      ipcRenderer.invoke('fileImport:parseCSVFile', filePath, options),
    performBatchImport: (options: CSVImportOptions, onProgress?: (progress: any) => void) => {
      // Set up progress listener
      if (onProgress) {
        const progressHandler = (_: any, progress: any) => onProgress(progress);
        ipcRenderer.on('fileImport:progress', progressHandler);
        
        // Clean up listener after import
        const cleanup = () => ipcRenderer.removeListener('fileImport:progress', progressHandler);
        
        return ipcRenderer.invoke('fileImport:performBatchImport', options)
          .finally(cleanup);
      }
      return ipcRenderer.invoke('fileImport:performBatchImport', options);
    },
    handleError: (error: any) => ipcRenderer.invoke('fileImport:handleError', error)
  },

  // File Export operations
  fileExport: {
    showSaveDialog: (options: SaveDialogOptions) => ipcRenderer.invoke('fileExport:showSaveDialog', options),
    exportData: (exportOptions: ExportOptions, filePath?: string, onProgress?: (progress: any) => void) => {
      // Set up progress listener
      if (onProgress) {
        const progressHandler = (_: any, progress: any) => onProgress(progress);
        ipcRenderer.on('fileExport:progress', progressHandler);
        
        // Clean up listener after export
        const cleanup = () => ipcRenderer.removeListener('fileExport:progress', progressHandler);
        
        return ipcRenderer.invoke('fileExport:exportData', exportOptions, filePath)
          .finally(cleanup);
      }
      return ipcRenderer.invoke('fileExport:exportData', exportOptions, filePath);
    },
    exportToiCal: (options: ExportOptions, filePath?: string) => 
      ipcRenderer.invoke('fileExport:exportToiCal', options, filePath),
    exportToCSV: (options: ExportOptions, filePath?: string) => 
      ipcRenderer.invoke('fileExport:exportToCSV', options, filePath),
    exportToPDF: (options: ExportOptions, filePath?: string) => 
      ipcRenderer.invoke('fileExport:exportToPDF', options, filePath),
    exportToJSON: (options: ExportOptions, filePath?: string) => 
      ipcRenderer.invoke('fileExport:exportToJSON', options, filePath),
    getAvailableFormats: () => ipcRenderer.invoke('fileExport:getAvailableFormats'),
    validateExportOptions: (options: ExportOptions) => 
      ipcRenderer.invoke('fileExport:validateExportOptions', options),
    handleError: (error: any) => ipcRenderer.invoke('fileExport:handleError', error)
  },

  // File Operations utilities
  fileOperations: {
    getStats: () => ipcRenderer.invoke('fileOperations:getStats')
  },

  // Assignment operations
  assignment: {
    generate: (weights?: any, constraints?: any) => ipcRenderer.invoke('assignment:generate', weights, constraints),
    getQualificationMatches: () => ipcRenderer.invoke('assignment:getQualificationMatches')
  }
};

declare global {
  interface Window {
    electronAPI: typeof electronAPI;
  }
}

contextBridge.exposeInMainWorld('electronAPI', electronAPI);