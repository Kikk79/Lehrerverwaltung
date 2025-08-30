import React, { useState, useEffect } from 'react';
import { SettingsService } from '../../../shared/services/SettingsService';

type Theme = 'light' | 'dark' | 'system';
type Language = 'de' | 'en';

const ApplicationPreferencesPanel: React.FC = () => {
  const [theme, setTheme] = useState<Theme>('system');
  const [language, setLanguage] = useState<Language>('de');
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [autoUpdateEnabled, setAutoUpdateEnabled] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [isDirty, setIsDirty] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Store original values for comparison
  const [originalSettings, setOriginalSettings] = useState({
    theme: 'system' as Theme,
    language: 'de' as Language,
    notificationsEnabled: true,
    autoUpdateEnabled: true
  });

  const settingsService = SettingsService.getInstance();

  useEffect(() => {
    loadSettings();
  }, []);

  useEffect(() => {
    // Check if any settings have changed
    const hasChanges = (
      theme !== originalSettings.theme ||
      language !== originalSettings.language ||
      notificationsEnabled !== originalSettings.notificationsEnabled ||
      autoUpdateEnabled !== originalSettings.autoUpdateEnabled
    );
    setIsDirty(hasChanges);
  }, [theme, language, notificationsEnabled, autoUpdateEnabled, originalSettings]);

  const loadSettings = async () => {
    try {
      setIsLoading(true);
      
      const [
        currentTheme,
        currentLanguage,
        currentNotifications,
        currentAutoUpdate
      ] = await Promise.all([
        settingsService.getTheme(),
        settingsService.getLanguage(),
        settingsService.getNotificationsEnabled(),
        settingsService.getAutoUpdateEnabled()
      ]);

      const settings = {
        theme: currentTheme,
        language: currentLanguage,
        notificationsEnabled: currentNotifications,
        autoUpdateEnabled: currentAutoUpdate
      };

      setTheme(currentTheme);
      setLanguage(currentLanguage);
      setNotificationsEnabled(currentNotifications);
      setAutoUpdateEnabled(currentAutoUpdate);
      setOriginalSettings(settings);
      
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Fehler beim Laden der Einstellungen');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveSettings = async () => {
    try {
      setIsLoading(true);
      setError(null);

      await Promise.all([
        settingsService.setTheme(theme),
        settingsService.setLanguage(language),
        settingsService.setNotificationsEnabled(notificationsEnabled),
        settingsService.setAutoUpdateEnabled(autoUpdateEnabled)
      ]);

      const newSettings = {
        theme,
        language,
        notificationsEnabled,
        autoUpdateEnabled
      };
      setOriginalSettings(newSettings);

      setSuccessMessage('Einstellungen erfolgreich gespeichert');
      setTimeout(() => setSuccessMessage(null), 3000);

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Fehler beim Speichern der Einstellungen');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDiscardChanges = () => {
    setTheme(originalSettings.theme);
    setLanguage(originalSettings.language);
    setNotificationsEnabled(originalSettings.notificationsEnabled);
    setAutoUpdateEnabled(originalSettings.autoUpdateEnabled);
    setError(null);
  };

  const handleResetToDefaults = () => {
    setTheme('system');
    setLanguage('de');
    setNotificationsEnabled(true);
    setAutoUpdateEnabled(true);
  };

  const getThemeIcon = (themeType: Theme) => {
    switch (themeType) {
      case 'light':
        return (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
          </svg>
        );
      case 'dark':
        return (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
          </svg>
        );
      case 'system':
        return (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
          </svg>
        );
    }
  };

  const getLanguageFlag = (lang: Language) => {
    return lang === 'de' ? '🇩🇪' : '🇺🇸';
  };

  if (isLoading && !theme) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Success Message */}
      {successMessage && (
        <div className="bg-green-50 border-l-4 border-green-400 p-4">
          <div className="flex">
            <svg className="w-5 h-5 text-green-400 mr-2" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
            </svg>
            <p className="text-green-700">{successMessage}</p>
          </div>
        </div>
      )}

      {/* Error Message */}
      {error && (
        <div className="bg-red-50 border-l-4 border-red-400 p-4">
          <div className="flex">
            <svg className="w-5 h-5 text-red-400 mr-2" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
            </svg>
            <p className="text-red-700">{error}</p>
          </div>
        </div>
      )}

      {/* Dirty State Indicator */}
      {isDirty && (
        <div className="bg-amber-50 border-l-4 border-amber-400 p-4">
          <div className="flex">
            <svg className="w-5 h-5 text-amber-400 mr-2" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
            <p className="text-amber-700">Sie haben ungespeicherte Änderungen</p>
          </div>
        </div>
      )}

      {/* Theme Selection */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Erscheinungsbild</h3>
        
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">Theme auswählen</label>
            <div className="grid grid-cols-3 gap-3">
              {(['light', 'dark', 'system'] as Theme[]).map((themeOption) => (
                <button
                  key={themeOption}
                  onClick={() => setTheme(themeOption)}
                  className={`p-4 border rounded-lg text-center transition-all ${
                    theme === themeOption
                      ? 'border-blue-500 bg-blue-50 text-blue-700'
                      : 'border-gray-200 hover:border-gray-300 text-gray-700'
                  }`}
                >
                  <div className="flex justify-center mb-2">
                    {getThemeIcon(themeOption)}
                  </div>
                  <div className="text-sm font-medium capitalize">
                    {themeOption === 'system' ? 'System' : 
                     themeOption === 'light' ? 'Hell' : 'Dunkel'}
                  </div>
                  <div className="text-xs text-gray-500 mt-1">
                    {themeOption === 'system' ? 'Automatisch' :
                     themeOption === 'light' ? 'Immer hell' : 'Immer dunkel'}
                  </div>
                </button>
              ))}
            </div>
          </div>

          <div className="text-sm text-gray-600 bg-gray-50 p-3 rounded">
            <h4 className="font-medium mb-1">Theme-Hinweise:</h4>
            <ul className="space-y-1">
              <li>• <strong>System:</strong> Folgt den Systemeinstellungen Ihres Betriebssystems</li>
              <li>• <strong>Hell:</strong> Klassisches helles Design für alle Situationen</li>
              <li>• <strong>Dunkel:</strong> Augenschonend bei schwachem Licht</li>
            </ul>
          </div>
        </div>
      </div>

      {/* Language Selection */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Sprache</h3>
        
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">Sprache auswählen</label>
            <div className="grid grid-cols-2 gap-3">
              {(['de', 'en'] as Language[]).map((langOption) => (
                <button
                  key={langOption}
                  onClick={() => setLanguage(langOption)}
                  className={`p-4 border rounded-lg text-center transition-all ${
                    language === langOption
                      ? 'border-blue-500 bg-blue-50 text-blue-700'
                      : 'border-gray-200 hover:border-gray-300 text-gray-700'
                  }`}
                >
                  <div className="text-2xl mb-2">{getLanguageFlag(langOption)}</div>
                  <div className="text-sm font-medium">
                    {langOption === 'de' ? 'Deutsch' : 'English'}
                  </div>
                  <div className="text-xs text-gray-500 mt-1">
                    {langOption === 'de' ? 'Deutschland' : 'United States'}
                  </div>
                </button>
              ))}
            </div>
          </div>

          <div className="text-sm text-amber-600 bg-amber-50 p-3 rounded">
            <div className="flex">
              <svg className="w-4 h-4 mr-2 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
              <div>
                <strong>Hinweis:</strong> Englische Lokalisierung ist noch nicht vollständig implementiert. 
                Die Anwendung wird größtenteils auf Deutsch bleiben.
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Notification Settings */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Benachrichtigungen</h3>
        
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <div className="flex items-center">
                <svg className="w-5 h-5 text-blue-600 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-5 5v-5zM11 19H6a2 2 0 01-2-2V7a2 2 0 012-2h8a2 2 0 012 2v3.5" />
                </svg>
                <div>
                  <label htmlFor="notifications" className="text-sm font-medium text-gray-900">
                    Desktop-Benachrichtigungen
                  </label>
                  <p className="text-xs text-gray-500">
                    Erhalten Sie Benachrichtigungen für wichtige Ereignisse
                  </p>
                </div>
              </div>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                id="notifications"
                checked={notificationsEnabled}
                onChange={(e) => setNotificationsEnabled(e.target.checked)}
                className="sr-only"
              />
              <div className={`w-11 h-6 rounded-full transition-colors ${
                notificationsEnabled ? 'bg-blue-600' : 'bg-gray-300'
              }`}>
                <div className={`w-5 h-5 bg-white rounded-full shadow transform transition-transform ${
                  notificationsEnabled ? 'translate-x-5' : 'translate-x-0'
                } mt-0.5 ml-0.5`}></div>
              </div>
            </label>
          </div>

          <div className="text-sm text-gray-600 bg-gray-50 p-3 rounded">
            <h4 className="font-medium mb-1">Benachrichtigungen umfassen:</h4>
            <ul className="space-y-1">
              <li>• Erfolgreiche Zuweisungserstellung</li>
              <li>• Fehler bei AI-Operationen</li>
              <li>• Backup- und Wiederherstellungsstatus</li>
              <li>• System-Updates und Wartungsmeldungen</li>
            </ul>
          </div>
        </div>
      </div>

      {/* Update Settings */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Updates</h3>
        
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <div className="flex items-center">
                <svg className="w-5 h-5 text-green-600 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                </svg>
                <div>
                  <label htmlFor="autoUpdate" className="text-sm font-medium text-gray-900">
                    Automatische Updates
                  </label>
                  <p className="text-xs text-gray-500">
                    Lade und installiere Updates automatisch im Hintergrund
                  </p>
                </div>
              </div>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                id="autoUpdate"
                checked={autoUpdateEnabled}
                onChange={(e) => setAutoUpdateEnabled(e.target.checked)}
                className="sr-only"
              />
              <div className={`w-11 h-6 rounded-full transition-colors ${
                autoUpdateEnabled ? 'bg-green-600' : 'bg-gray-300'
              }`}>
                <div className={`w-5 h-5 bg-white rounded-full shadow transform transition-transform ${
                  autoUpdateEnabled ? 'translate-x-5' : 'translate-x-0'
                } mt-0.5 ml-0.5`}></div>
              </div>
            </label>
          </div>

          <div className="text-sm text-gray-600 bg-gray-50 p-3 rounded">
            <h4 className="font-medium mb-1">Update-Hinweise:</h4>
            <ul className="space-y-1">
              <li>• Updates werden nur bei WLAN-Verbindungen heruntergeladen</li>
              <li>• Sie werden vor der Installation benachrichtigt</li>
              <li>• Kritische Sicherheitsupdates werden immer installiert</li>
              <li>• Updates können in den Anwendungseinstellungen manuell geprüft werden</li>
            </ul>
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex flex-wrap gap-2 justify-between">
        <div className="flex gap-2">
          <button
            onClick={handleResetToDefaults}
            className="px-4 py-2 text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
          >
            Auf Standard zurücksetzen
          </button>
          {isDirty && (
            <button
              onClick={handleDiscardChanges}
              className="px-4 py-2 text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Änderungen verwerfen
            </button>
          )}
        </div>
        
        <button
          onClick={handleSaveSettings}
          disabled={!isDirty || isLoading}
          className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-blue-400 disabled:cursor-not-allowed transition-colors"
        >
          {isLoading ? 'Speichern...' : 'Einstellungen speichern'}
        </button>
      </div>
    </div>
  );
};

export default ApplicationPreferencesPanel;