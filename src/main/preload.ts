import { contextBridge, ipcRenderer } from 'electron';
import { Teacher, Course, Assignment } from '../shared/types';

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
  }
};

declare global {
  interface Window {
    electronAPI: typeof electronAPI;
  }
}

contextBridge.exposeInMainWorld('electronAPI', electronAPI);