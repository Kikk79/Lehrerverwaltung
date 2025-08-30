import { app, BrowserWindow, ipcMain } from 'electron';
import * as path from 'path';
import { MainDatabaseHandler } from './database';

class TeacherAssignmentApp {
  private mainWindow: BrowserWindow | null = null;
  private databaseHandler!: MainDatabaseHandler;

  constructor() {
    this.init();
  }

  private init(): void {
    app.whenReady().then(() => {
      this.databaseHandler = new MainDatabaseHandler();
      this.createWindow();
      this.registerIpcHandlers();
    });

    app.on('window-all-closed', () => {
      if (process.platform !== 'darwin') {
        this.databaseHandler?.close();
        app.quit();
      }
    });

    app.on('activate', () => {
      if (BrowserWindow.getAllWindows().length === 0) {
        this.createWindow();
      }
    });
  }

  private createWindow(): void {
    this.mainWindow = new BrowserWindow({
      width: 1400,
      height: 900,
      minWidth: 1000,
      minHeight: 700,
      webPreferences: {
        nodeIntegration: false,
        contextIsolation: true,
        preload: path.join(__dirname, 'preload.js'),
        webSecurity: true
      },
      icon: path.join(__dirname, '../../assets/icon.png'),
      titleBarStyle: 'default',
      show: false
    });

    if (process.env.NODE_ENV === 'development') {
      this.mainWindow.loadURL('http://localhost:3000');
      this.mainWindow.webContents.openDevTools();
    } else {
      this.mainWindow.loadFile(path.join(__dirname, '../renderer/index.html'));
    }

    this.mainWindow.once('ready-to-show', () => {
      this.mainWindow?.show();
    });

    this.mainWindow.on('closed', () => {
      this.mainWindow = null;
    });
  }

  private registerIpcHandlers(): void {
    ipcMain.handle('app:getVersion', () => {
      return app.getVersion();
    });

    ipcMain.handle('app:getPlatform', () => {
      return process.platform;
    });

    ipcMain.handle('app:quit', () => {
      app.quit();
    });
  }
}

new TeacherAssignmentApp();