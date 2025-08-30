import React, { useState, useEffect } from 'react';
import { BackupService } from '../../../shared/services/BackupService';

interface DatabaseStats {
  teachers: number;
  courses: number;
  assignments: number;
  weightingPresets: number;
  chatConversations: number;
  settings: number;
}

const DatabaseSettingsPanel: React.FC = () => {
  const [stats, setStats] = useState<DatabaseStats | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [showConfirmDialog, setShowConfirmDialog] = useState<{
    type: 'backup' | 'restore' | 'clear' | null;
    title: string;
    message: string;
    data?: string;
  }>({ type: null, title: '', message: '' });

  const backupService = BackupService.getInstance();

  useEffect(() => {
    loadDatabaseStats();
  }, []);

  const loadDatabaseStats = async () => {
    try {
      setIsLoading(true);
      const databaseStats = await backupService.getDatabaseStats();
      setStats(databaseStats);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Fehler beim Laden der Datenbankstatistiken');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateBackup = async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      const backupData = await backupService.createBackup();
      
      // Trigger file download
      const blob = new Blob([backupData], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = backupService.getSuggestedBackupFilename();
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      
      setSuccessMessage('Backup erfolgreich erstellt und heruntergeladen');
      setTimeout(() => setSuccessMessage(null), 5000);
      
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Fehler beim Erstellen des Backups');
    } finally {
      setIsLoading(false);
    }
  };

  const handleRestoreBackup = () => {
    // Create file input element
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;
      
      try {
        const backupData = await file.text();
        
        // Validate backup format
        const validation = backupService.validateBackupFormat(backupData);
        if (!validation.isValid) {
          setError(`Ungültiges Backup-Format: ${validation.errors.join(', ')}`);
          return;
        }
        
        setShowConfirmDialog({
          type: 'restore',
          title: 'Backup wiederherstellen',
          message: 'Möchten Sie wirklich das Backup wiederherstellen? Diese Aktion ersetzt alle aktuellen Daten und kann nicht rückgängig gemacht werden.',
          data: backupData
        });
        
      } catch (err) {
        setError('Fehler beim Lesen der Backup-Datei');
      }
    };
    input.click();
  };

  const handleConfirmRestore = async () => {
    if (!showConfirmDialog.data) return;
    
    try {
      setIsLoading(true);
      setError(null);
      
      await backupService.restoreFromBackup(showConfirmDialog.data, { clearExisting: true });
      await loadDatabaseStats(); // Refresh stats
      
      setSuccessMessage('Backup erfolgreich wiederhergestellt');
      setTimeout(() => setSuccessMessage(null), 5000);
      
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Fehler beim Wiederherstellen des Backups');
    } finally {
      setIsLoading(false);
      setShowConfirmDialog({ type: null, title: '', message: '' });
    }
  };

  const handleClearAllData = () => {
    setShowConfirmDialog({
      type: 'clear',
      title: 'Alle Daten löschen',
      message: 'Möchten Sie wirklich ALLE Daten aus der Datenbank löschen? Diese Aktion kann nicht rückgängig gemacht werden und löscht alle Lehrer, Kurse, Zuweisungen, Chat-Verläufe und Einstellungen.'
    });
  };

  const handleConfirmClear = async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      await backupService.clearAllData();
      await loadDatabaseStats(); // Refresh stats
      
      setSuccessMessage('Alle Daten wurden erfolgreich gelöscht');
      setTimeout(() => setSuccessMessage(null), 5000);
      
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Fehler beim Löschen der Daten');
    } finally {
      setIsLoading(false);
      setShowConfirmDialog({ type: null, title: '', message: '' });
    }
  };

  const handleExportData = async (format: 'json' | 'csv') => {
    try {
      setIsLoading(true);
      setError(null);
      
      if (format === 'json') {
        await handleCreateBackup();
      } else {
        // For CSV, we could implement a separate export
        setError('CSV-Export ist noch nicht implementiert');
      }
      
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Fehler beim Exportieren der Daten');
    } finally {
      setIsLoading(false);
    }
  };

  const closeConfirmDialog = () => {
    setShowConfirmDialog({ type: null, title: '', message: '' });
  };

  if (isLoading && !stats) {
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

      {/* Database Statistics */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Datenbankstatistiken</h3>
        
        {stats && (
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            <div className="text-center p-4 bg-blue-50 rounded-lg">
              <div className="text-2xl font-bold text-blue-600">{stats.teachers}</div>
              <div className="text-sm text-blue-800">Lehrer</div>
            </div>
            <div className="text-center p-4 bg-green-50 rounded-lg">
              <div className="text-2xl font-bold text-green-600">{stats.courses}</div>
              <div className="text-sm text-green-800">Kurse</div>
            </div>
            <div className="text-center p-4 bg-purple-50 rounded-lg">
              <div className="text-2xl font-bold text-purple-600">{stats.assignments}</div>
              <div className="text-sm text-purple-800">Zuweisungen</div>
            </div>
            <div className="text-center p-4 bg-orange-50 rounded-lg">
              <div className="text-2xl font-bold text-orange-600">{stats.weightingPresets}</div>
              <div className="text-sm text-orange-800">Gewichtungs-Presets</div>
            </div>
            <div className="text-center p-4 bg-indigo-50 rounded-lg">
              <div className="text-2xl font-bold text-indigo-600">{stats.chatConversations}</div>
              <div className="text-sm text-indigo-800">Chat-Unterhaltungen</div>
            </div>
            <div className="text-center p-4 bg-gray-50 rounded-lg">
              <div className="text-2xl font-bold text-gray-600">{stats.settings}</div>
              <div className="text-sm text-gray-800">Einstellungen</div>
            </div>
          </div>
        )}
        
        <button
          onClick={loadDatabaseStats}
          disabled={isLoading}
          className="mt-4 px-3 py-1 text-sm bg-gray-100 text-gray-700 rounded hover:bg-gray-200 disabled:bg-gray-50"
        >
          {isLoading ? 'Aktualisieren...' : 'Statistiken aktualisieren'}
        </button>
      </div>

      {/* Backup Operations */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Backup & Wiederherstellung</h3>
        
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row gap-3">
            <button
              onClick={handleCreateBackup}
              disabled={isLoading}
              className="flex-1 flex items-center justify-center px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-blue-400 transition-colors"
            >
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              {isLoading ? 'Backup erstellen...' : 'Backup erstellen'}
            </button>
            
            <button
              onClick={handleRestoreBackup}
              disabled={isLoading}
              className="flex-1 flex items-center justify-center px-4 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-green-400 transition-colors"
            >
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M9 19l3 3m0 0l3-3m-3 3V10" />
              </svg>
              {isLoading ? 'Wiederherstellen...' : 'Backup wiederherstellen'}
            </button>
          </div>
          
          <div className="text-sm text-gray-600 bg-gray-50 p-3 rounded">
            <h4 className="font-medium mb-1">Backup-Hinweise:</h4>
            <ul className="space-y-1">
              <li>• Backups enthalten alle Daten: Lehrer, Kurse, Zuweisungen, Chat-Verläufe und Einstellungen</li>
              <li>• Backups werden als JSON-Dateien gespeichert und sind plattformunabhängig</li>
              <li>• Bei der Wiederherstellung werden alle aktuellen Daten überschrieben</li>
              <li>• Erstellen Sie regelmäßig Backups vor wichtigen Änderungen</li>
            </ul>
          </div>
        </div>
      </div>

      {/* Data Export */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Datenexport</h3>
        
        <div className="space-y-3">
          <button
            onClick={() => handleExportData('json')}
            disabled={isLoading}
            className="w-full flex items-center justify-center px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 disabled:bg-gray-50 transition-colors"
          >
            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            JSON-Export (Vollständiges Backup)
          </button>
          
          <button
            onClick={() => handleExportData('csv')}
            disabled={true}
            className="w-full flex items-center justify-center px-4 py-2 border border-gray-300 text-gray-400 rounded-lg cursor-not-allowed"
          >
            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            CSV-Export (Kommt bald)
          </button>
        </div>
      </div>

      {/* Dangerous Operations */}
      <div className="bg-red-50 border border-red-200 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-red-900 mb-4">Gefährliche Operationen</h3>
        
        <div className="space-y-3">
          <button
            onClick={handleClearAllData}
            disabled={isLoading}
            className="w-full flex items-center justify-center px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:bg-red-400 transition-colors"
          >
            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
            {isLoading ? 'Löschen...' : 'Alle Daten löschen'}
          </button>
          
          <div className="text-sm text-red-700 bg-red-100 p-3 rounded">
            <h4 className="font-medium mb-1">⚠️ Warnung:</h4>
            <p>Das Löschen aller Daten kann nicht rückgängig gemacht werden. Erstellen Sie vorher unbedingt ein Backup!</p>
          </div>
        </div>
      </div>

      {/* Confirmation Dialog */}
      {showConfirmDialog.type && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg max-w-md w-full mx-4 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-3">{showConfirmDialog.title}</h3>
            <p className="text-gray-600 mb-6">{showConfirmDialog.message}</p>
            
            <div className="flex justify-end space-x-3">
              <button
                onClick={closeConfirmDialog}
                className="px-4 py-2 text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                Abbrechen
              </button>
              <button
                onClick={showConfirmDialog.type === 'restore' ? handleConfirmRestore : handleConfirmClear}
                disabled={isLoading}
                className={`px-4 py-2 text-white rounded-lg disabled:opacity-50 ${
                  showConfirmDialog.type === 'clear' 
                    ? 'bg-red-600 hover:bg-red-700' 
                    : 'bg-green-600 hover:bg-green-700'
                }`}
              >
                {isLoading ? 'Wird ausgeführt...' : 'Bestätigen'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DatabaseSettingsPanel;