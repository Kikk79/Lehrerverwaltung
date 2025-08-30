interface ElectronAPI {
  getVersion: () => Promise<string>;
  getPlatform: () => Promise<string>;
  quit: () => Promise<void>;
  
  onUpdateAvailable: (callback: () => void) => () => void;
  onUpdateDownloaded: (callback: () => void) => () => void;

  database: {
    // Teacher operations
    createTeacher: (teacher: any) => Promise<any>;
    getTeacher: (id: number) => Promise<any>;
    getAllTeachers: () => Promise<any[]>;
    updateTeacher: (id: number, updates: any) => Promise<any>;
    deleteTeacher: (id: number) => Promise<void>;

    // Course operations
    createCourse: (course: any) => Promise<any>;
    getCourse: (id: number) => Promise<any>;
    getAllCourses: () => Promise<any[]>;
    updateCourse: (id: number, updates: any) => Promise<any>;
    deleteCourse: (id: number) => Promise<void>;

    // Assignment operations
    createAssignment: (assignment: any) => Promise<any>;
    getAssignment: (id: number) => Promise<any>;
    getAllAssignments: () => Promise<any[]>;
    updateAssignment: (id: number, updates: any) => Promise<any>;
    deleteAssignment: (id: number) => Promise<void>;

    // Settings operations
    getSetting: (key: string) => Promise<string | null>;
    setSetting: (key: string, value: string) => Promise<void>;
    getAllSettings: () => Promise<any[]>;

    // Utility operations
    getStats: () => Promise<any>;
  };
}

declare global {
  interface Window {
    electronAPI: ElectronAPI;
  }
}

export {};