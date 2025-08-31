import { app, BrowserWindow, ipcMain } from 'electron';
import * as path from 'path';
import * as fs from 'fs';
import { MainDatabaseHandler } from './database';
import { MainFileOperationsHandler } from './fileOperations';
import { AnthropicService } from '../shared/services/AnthropicService';

class TeacherAssignmentApp {
  private mainWindow: BrowserWindow | null = null;
  private databaseHandler!: MainDatabaseHandler;
  private fileOperationsHandler!: MainFileOperationsHandler;
  private aiService!: AnthropicService;

  constructor() {
    this.init();
  }

  private init(): void {
    app.whenReady().then(async () => {
      console.log('[main] App ready');
      this.databaseHandler = new MainDatabaseHandler();
      this.aiService = new AnthropicService();
      this.fileOperationsHandler = new MainFileOperationsHandler(
        this.databaseHandler.getDatabaseService(),
        this.aiService
      );
      
      // Initialize AI service with stored settings
      await this.fileOperationsHandler.initializeServices();
      
      this.createWindow();
      this.registerIpcHandlers();
    });

    app.on('window-all-closed', () => {
      if (process.platform !== 'darwin') {
        this.databaseHandler?.close();
        this.fileOperationsHandler?.cleanup();
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
    console.log('[main] Creating window');

    const getIconPath = () => {
      const fileName = process.platform === 'win32' ? 'icon.ico' : 'icon.png';
      if (app.isPackaged) {
        // In packaged apps, assets are typically under resources
        return path.join(process.resourcesPath, 'assets', fileName);
      }
      // In dev, resolve from project root
      const candidate = path.join(process.cwd(), 'assets', fileName);
      if (fs.existsSync(candidate)) return candidate;
      // Fallback relative to dist/main
      return path.join(__dirname, '../../assets', fileName);
    };

    const iconPath = getIconPath();

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
      icon: iconPath,
      titleBarStyle: 'default',
      show: false
    });

    const devUrl = process.env.ELECTRON_RENDERER_URL;
    let windowShown = false;

    if (devUrl) {
      console.log('[main] Loading dev URL:', devUrl);
      this.mainWindow.loadURL(devUrl).catch(err => {
        console.error('[main] loadURL error:', err);
        console.log('[main] Falling back to local file');
        this.mainWindow?.loadFile(path.join(__dirname, '../renderer/index.html')).catch(e => console.error('[main] loadFile fallback error:', e));
      });
      this.mainWindow.webContents.openDevTools({ mode: 'detach' });
    } else {
      console.log('[main] Loading local file');
      this.mainWindow.loadFile(path.join(__dirname, '../renderer/index.html')).catch(err => console.error('[main] loadFile error:', err));
    }

    this.mainWindow.webContents.on('did-finish-load', () => {
      console.log('[main] Renderer did-finish-load');
    });

    this.mainWindow.webContents.on('did-fail-load', (_event, errorCode, errorDescription, validatedURL) => {
      console.error('[main] did-fail-load', { errorCode, errorDescription, validatedURL });
      if (devUrl && validatedURL && /^https?:/i.test(validatedURL)) {
        console.log('[main] Falling back to local file after dev URL failed');
        this.mainWindow?.loadFile(path.join(__dirname, '../renderer/index.html')).catch(e => console.error('[main] Fallback loadFile error:', e));
      }
    });

    this.mainWindow.webContents.on('render-process-gone', (_e, details) => {
      console.error('[main] render-process-gone', details);
    });

    this.mainWindow.on('unresponsive', () => {
      console.warn('[main] Window is unresponsive');
    });

    this.mainWindow.once('ready-to-show', () => {
      console.log('[main] Window ready-to-show');
      windowShown = true;
      this.mainWindow?.show();
    });

    // Safety timeout to ensure the window becomes visible
    setTimeout(() => {
      if (!windowShown && this.mainWindow && !this.mainWindow.isVisible()) {
        console.warn('[main] Window not shown after timeout, forcing show');
        this.mainWindow.show();
      }
    }, 5000);

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

    // Environment helpers (do not expose secrets by default)
    ipcMain.handle('env:has', (_evt, name: string) => {
      return Boolean(process.env?.[name]);
    });
    ipcMain.handle('env:getMasked', (_evt, name: string) => {
      const val = process.env?.[name];
      if (!val) return null;
      return '••••••••••••••••••••' + val.slice(-4);
    });

    // AI connectivity test using whichever key would be used at runtime
    ipcMain.handle('ai:testConnection', async () => {
      try {
        const envKey = process.env.ANTHROPIC_API_KEY?.trim();
        const db = this.databaseHandler.getDatabaseService();
        let storedKey = db.getSetting('anthropic_api_key') || db.getSetting('ai_api_key');
        let decodedKey: string | null = null;
        if (storedKey) {
          try {
            const maybe = Buffer.from(storedKey, 'base64').toString('utf8');
            decodedKey = maybe.startsWith('sk-ant-') ? maybe : storedKey;
          } catch {
            decodedKey = storedKey;
          }
        }
        const apiKey = envKey || decodedKey || null;
        if (!apiKey) return false;

        // Use selected model from settings (fall back to Sonnet to avoid Haiku access issues)
        const rawModel = db.getSetting('selected_ai_model') || 'claude-sonnet-4-20250514';
        const allowed: any = ['claude-haiku-3.5-20241022','claude-sonnet-4-20250514','claude-opus-4-20241022'];
        const selectedModel = (allowed.includes(rawModel) ? rawModel : 'claude-sonnet-4-20250514') as any;

        const temp = new AnthropicService();
        await temp.initialize({
          apiKey,
          model: selectedModel,
          maxTokens: 10,
          temperature: 0.1,
          systemPrompt: 'Ping'
        });
        return true;
      } catch (e) {
        console.error('[main] AI test connection failed:', e);
        return false;
      }
    });

    ipcMain.handle('app:quit', () => {
      app.quit();
    });
  }
}

new TeacherAssignmentApp();
