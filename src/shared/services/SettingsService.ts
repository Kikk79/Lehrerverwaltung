import { WeightingSettings } from '../types';
// In the renderer, use the IPC-backed database exposed by preload (window.electronAPI.database)
// In non-renderer (main) contexts, lazily load the local DatabaseService implementation without bundling it into the renderer.
const isRenderer = typeof process !== 'undefined' && (process as any)?.type === 'renderer';
let FallbackDatabaseService: any = null;
if (!isRenderer) {
  try {
    // Use eval('require') so webpack doesn't statically include this in renderer bundles
    // eslint-disable-next-line no-eval
    const nodeRequire = eval('require');
    FallbackDatabaseService = nodeRequire('./DatabaseService').DatabaseService;
  } catch {
    FallbackDatabaseService = null;
  }
}

/**
 * Service for managing all application settings
 * Handles secure storage, validation, and retrieval of user preferences
 */
export class SettingsService {
  private static instance: SettingsService;
  private databaseService: any;

  private constructor() {
    const maybeElectronDB = (typeof window !== 'undefined' && (window as any)?.electronAPI?.database)
      ? (window as any).electronAPI.database
      : null;
    this.databaseService = maybeElectronDB || (FallbackDatabaseService ? FallbackDatabaseService.getInstance() : null);
  }

  public static getInstance(): SettingsService {
    if (!SettingsService.instance) {
      SettingsService.instance = new SettingsService();
    }
    return SettingsService.instance;
  }

  // ===================
  // API Configuration
  // ===================

  /**
   * Store API key securely with basic encryption
   */
  async setApiKey(apiKey: string): Promise<void> {
    try {
      // Basic encryption for local storage (better than plaintext)
      const encrypted = Buffer.from(apiKey).toString('base64');
      await this.databaseService.setSetting('anthropic_api_key', encrypted);
    } catch (error) {
      throw new Error(`Fehler beim Speichern des API-Schlüssels: ${error instanceof Error ? error.message : 'Unbekannter Fehler'}`);
    }
  }

  /**
   * Retrieve decrypted API key
   */
  async getApiKey(): Promise<string | null> {
    try {
      // Do not expose secret env value to renderer via code; only DB value is returned here
      const encrypted = await this.databaseService.getSetting('anthropic_api_key')
        || await this.databaseService.getSetting('ai_api_key');
      if (!encrypted) return null;
      
      try {
        const decoded = Buffer.from(encrypted, 'base64').toString('utf8');
        return decoded.startsWith('sk-ant-') ? decoded : encrypted;
      } catch {
        return encrypted;
      }
    } catch (error) {
      console.error('Error retrieving API key:', error);
      return null;
    }
  }

  /**
   * Test API key connectivity
   */
  async testApiConnection(): Promise<boolean> {
    try {
      // Prefer main-process connectivity test so env var can be used securely
      const hasIpc = typeof window !== 'undefined' && (window as any)?.electronAPI?.ai?.testConnection;
      if (hasIpc) {
        return await (window as any).electronAPI.ai.testConnection();
      }
      // Fallback: just check presence of a key in non-renderer contexts
      const envKey = (typeof process !== 'undefined' && (process as any).env?.ANTHROPIC_API_KEY) ? 'present' : '';
      const dbKey = await this.getApiKey();
      return Boolean(envKey || dbKey);
    } catch (error) {
      console.error('API connection test failed:', error);
      return false;
    }
  }

  /**
   * Clear stored API key
   */
  async clearApiKey(): Promise<void> {
    await this.databaseService.setSetting('anthropic_api_key', '');
  }

  // ===================
  // Model Configuration
  // ===================

  /**
   * Set selected AI model
   */
  async setSelectedModel(modelId: string): Promise<void> {
    await this.databaseService.setSetting('selected_ai_model', modelId);
  }

  /**
   * Get selected AI model (default to Claude 4 Sonnet)
   */
  async getSelectedModel(): Promise<string> {
    const model = await this.databaseService.getSetting('selected_ai_model');
    return model || 'claude-sonnet-4-20250514';
  }

  // ===================
  // Weighting Defaults
  // ===================

  /**
   * Set default weighting values for assignments
   */
  async setDefaultWeights(weights: { equality: number; continuity: number; loyalty: number }): Promise<void> {
    // Validate weights sum to 100
    const total = weights.equality + weights.continuity + weights.loyalty;
    if (total !== 100) {
      throw new Error('Gewichtungen müssen in der Summe 100% ergeben');
    }

    // Validate individual weight ranges
    const { equality, continuity, loyalty } = weights;
    if (equality < 0 || equality > 100 || continuity < 0 || continuity > 100 || loyalty < 0 || loyalty > 100) {
      throw new Error('Gewichtungen müssen zwischen 0% und 100% liegen');
    }

    await this.databaseService.setSetting('default_equality_weight', equality.toString());
    await this.databaseService.setSetting('default_continuity_weight', continuity.toString());
    await this.databaseService.setSetting('default_loyalty_weight', loyalty.toString());
  }

  /**
   * Get default weighting values
   */
  async getDefaultWeights(): Promise<{ equality: number; continuity: number; loyalty: number }> {
    const equality = parseInt(await this.databaseService.getSetting('default_equality_weight') || '33');
    const continuity = parseInt(await this.databaseService.getSetting('default_continuity_weight') || '33');
    const loyalty = parseInt(await this.databaseService.getSetting('default_loyalty_weight') || '34');

    return { equality, continuity, loyalty };
  }

  // ===================
  // Weighting Presets
  // ===================

  /**
   * Get all weighting presets
   */
  async getWeightingPresets(): Promise<WeightingSettings[]> {
    try {
      return await this.databaseService.getWeightingPresets();
    } catch (error) {
      console.error('Error getting weighting presets:', error);
      return [];
    }
  }

  /**
   * Create or update weighting preset
   */
  async saveWeightingPreset(preset: Omit<WeightingSettings, 'id' | 'created_at' | 'updated_at'>): Promise<void> {
    try {
      await this.databaseService.saveWeightingPreset(preset);
    } catch (error) {
      throw new Error(`Fehler beim Speichern des Gewichtungs-Presets: ${error instanceof Error ? error.message : 'Unbekannter Fehler'}`);
    }
  }

  /**
   * Delete weighting preset
   */
  async deleteWeightingPreset(id: number): Promise<void> {
    try {
      await this.databaseService.deleteWeightingPreset(id);
    } catch (error) {
      throw new Error(`Fehler beim Löschen des Gewichtungs-Presets: ${error instanceof Error ? error.message : 'Unbekannter Fehler'}`);
    }
  }

  /**
   * Set default weighting preset
   */
  async setDefaultWeightingPreset(id: number): Promise<void> {
    try {
      await this.databaseService.setDefaultWeightingPreset(id);
    } catch (error) {
      throw new Error(`Fehler beim Setzen des Standard-Presets: ${error instanceof Error ? error.message : 'Unbekannter Fehler'}`);
    }
  }

  // ===================
  // Application Preferences
  // ===================

  /**
   * Set application theme
   */
  async setTheme(theme: 'light' | 'dark' | 'system'): Promise<void> {
    await this.databaseService.setSetting('app_theme', theme);
  }

  /**
   * Get application theme
   */
  async getTheme(): Promise<'light' | 'dark' | 'system'> {
    const theme = await this.databaseService.getSetting('app_theme');
    return (theme as 'light' | 'dark' | 'system') || 'system';
  }

  /**
   * Set language preference
   */
  async setLanguage(language: 'de' | 'en'): Promise<void> {
    await this.databaseService.setSetting('app_language', language);
  }

  /**
   * Get language preference
   */
  async getLanguage(): Promise<'de' | 'en'> {
    const language = await this.databaseService.getSetting('app_language');
    return (language as 'de' | 'en') || 'de';
  }

  /**
   * Set notification preferences
   */
  async setNotificationsEnabled(enabled: boolean): Promise<void> {
    await this.databaseService.setSetting('notifications_enabled', enabled.toString());
  }

  /**
   * Get notification preferences
   */
  async getNotificationsEnabled(): Promise<boolean> {
    const enabled = await this.databaseService.getSetting('notifications_enabled');
    return enabled === 'true';
  }

  /**
   * Set auto-update preferences
   */
  async setAutoUpdateEnabled(enabled: boolean): Promise<void> {
    await this.databaseService.setSetting('auto_update_enabled', enabled.toString());
  }

  /**
   * Get auto-update preferences
   */
  async getAutoUpdateEnabled(): Promise<boolean> {
    const enabled = await this.databaseService.getSetting('auto_update_enabled');
    return enabled !== 'false'; // Default to true
  }

  // ===================
  // System Prompt Settings
  // ===================

  /**
   * Set custom system prompt for a specific type
   */
  async setSystemPrompt(type: string, prompt: string): Promise<void> {
    await this.databaseService.setSetting(`system_prompt_${type}`, prompt);
  }

  /**
   * Get custom system prompt for a specific type
   */
  async getSystemPrompt(type: string): Promise<string | null> {
    return await this.databaseService.getSetting(`system_prompt_${type}`);
  }

  // ===================
  // Settings Export/Import
  // ===================

  /**
   * Export all settings to JSON
   */
  async exportSettings(): Promise<string> {
    try {
      const settings = {
        apiKey: await this.getApiKey(),
        selectedModel: await this.getSelectedModel(),
        defaultWeights: await this.getDefaultWeights(),
        weightingPresets: await this.getWeightingPresets(),
        theme: await this.getTheme(),
        language: await this.getLanguage(),
        notificationsEnabled: await this.getNotificationsEnabled(),
        autoUpdateEnabled: await this.getAutoUpdateEnabled(),
        exportDate: new Date().toISOString()
      };

      return JSON.stringify(settings, null, 2);
    } catch (error) {
      throw new Error(`Fehler beim Exportieren der Einstellungen: ${error instanceof Error ? error.message : 'Unbekannter Fehler'}`);
    }
  }

  /**
   * Import settings from JSON
   */
  async importSettings(jsonSettings: string): Promise<void> {
    try {
      const settings = JSON.parse(jsonSettings);

      // Import API key
      if (settings.apiKey) {
        await this.setApiKey(settings.apiKey);
      }

      // Import model selection
      if (settings.selectedModel) {
        await this.setSelectedModel(settings.selectedModel);
      }

      // Import default weights
      if (settings.defaultWeights) {
        await this.setDefaultWeights(settings.defaultWeights);
      }

      // Import weighting presets
      if (settings.weightingPresets && Array.isArray(settings.weightingPresets)) {
        for (const preset of settings.weightingPresets) {
          await this.saveWeightingPreset(preset);
        }
      }

      // Import application preferences
      if (settings.theme) {
        await this.setTheme(settings.theme);
      }

      if (settings.language) {
        await this.setLanguage(settings.language);
      }

      if (typeof settings.notificationsEnabled === 'boolean') {
        await this.setNotificationsEnabled(settings.notificationsEnabled);
      }

      if (typeof settings.autoUpdateEnabled === 'boolean') {
        await this.setAutoUpdateEnabled(settings.autoUpdateEnabled);
      }

    } catch (error) {
      throw new Error(`Fehler beim Importieren der Einstellungen: ${error instanceof Error ? error.message : 'Ungültiges JSON oder Datenformat'}`);
    }
  }

  // ===================
  // Settings Validation
  // ===================

  /**
   * Validate all current settings
   */
  async validateSettings(): Promise<{ isValid: boolean; errors: string[] }> {
    const errors: string[] = [];

    try {
      // Validate API key exists (consider environment variable)
      const hasEnv = typeof window !== 'undefined' && (window as any)?.electronAPI?.env ?
        await (window as any).electronAPI.env.has('ANTHROPIC_API_KEY') :
        Boolean((typeof process !== 'undefined' && (process as any).env?.ANTHROPIC_API_KEY));
      const apiKey = await this.getApiKey();
      if (!hasEnv && !apiKey) {
        errors.push('API-Schlüssel ist nicht konfiguriert');
      }

      // Validate model selection
      const model = await this.getSelectedModel();
      const validModels = ['claude-haiku-3.5-20241022', 'claude-sonnet-4-20250514', 'claude-opus-4-20241022'];
      if (!validModels.includes(model)) {
        errors.push('Ungültiges AI-Modell ausgewählt');
      }

      // Validate default weights
      const weights = await this.getDefaultWeights();
      const total = weights.equality + weights.continuity + weights.loyalty;
      if (total !== 100) {
        errors.push('Standard-Gewichtungen ergeben nicht 100%');
      }

      return {
        isValid: errors.length === 0,
        errors
      };

    } catch (error) {
      errors.push(`Validierungsfehler: ${error instanceof Error ? error.message : 'Unbekannter Fehler'}`);
      return {
        isValid: false,
        errors
      };
    }
  }

  // ===================
  // Initialize Default Settings
  // ===================

  /**
   * Initialize default settings on first run
   */
  async initializeDefaults(): Promise<void> {
    try {
      // Check if already initialized
      const initialized = await this.databaseService.getSetting('settings_initialized');
      if (initialized === 'true') {
        return;
      }

      // Set default weighting presets if they don't exist
      const existingPresets = await this.getWeightingPresets();
      if (existingPresets.length === 0) {
        // Normal preset
        await this.saveWeightingPreset({
          profile_name: 'Normal',
          equality_weight: 33,
          continuity_weight: 33,
          loyalty_weight: 34,
          is_default: true
        });

        // Emergency preset (reduced loyalty for flexibility)
        await this.saveWeightingPreset({
          profile_name: 'Notfall',
          equality_weight: 50,
          continuity_weight: 40,
          loyalty_weight: 10,
          is_default: false
        });

        // Balanced preset
        await this.saveWeightingPreset({
          profile_name: 'Ausgewogen',
          equality_weight: 40,
          continuity_weight: 30,
          loyalty_weight: 30,
          is_default: false
        });
      }

      // Set default application preferences
      const theme = await this.getTheme();
      if (!theme) {
        await this.setTheme('system');
      }

      const language = await this.getLanguage();
      if (!language) {
        await this.setLanguage('de');
      }

      // Mark as initialized
      await this.databaseService.setSetting('settings_initialized', 'true');

    } catch (error) {
      console.error('Failed to initialize default settings:', error);
      throw new Error('Fehler beim Initialisieren der Standard-Einstellungen');
    }
  }
}