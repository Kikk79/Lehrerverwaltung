import React, { useState, useCallback } from 'react';
import { ExportOptions, ExportFormat } from '../../../shared/types';
import { ExportResult, ExportProgress } from '../../../shared/services/FileExportService';

interface ExportDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onExportComplete?: (result: ExportResult) => void;
}

const ExportDialog: React.FC<ExportDialogProps> = ({ isOpen, onClose, onExportComplete }) => {
  const [exportOptions, setExportOptions] = useState<ExportOptions>({
    format: 'csv',
    include_assignments: true,
    include_teachers: false,
    include_courses: false,
    date_range: undefined
  });
  
  const [isExporting, setIsExporting] = useState(false);
  const [exportProgress, setExportProgress] = useState<ExportProgress>({
    current_item: 0,
    total_items: 0,
    current_operation: '',
    percentage: 0
  });
  const [exportResult, setExportResult] = useState<ExportResult | null>(null);
  const [dateRangeEnabled, setDateRangeEnabled] = useState(false);
  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [endDate, setEndDate] = useState(new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]);

  const handleExportOptionChange = (key: keyof ExportOptions, value: any) => {
    setExportOptions(prev => ({
      ...prev,
      [key]: value
    }));
  };

  const handleDateRangeToggle = (enabled: boolean) => {
    setDateRangeEnabled(enabled);
    if (enabled) {
      setExportOptions(prev => ({
        ...prev,
        date_range: {
          start: startDate,
          end: endDate
        }
      }));
    } else {
      setExportOptions(prev => ({
        ...prev,
        date_range: undefined
      }));
    }
  };

  const handleDateChange = (type: 'start' | 'end', date: string) => {
    if (type === 'start') {
      setStartDate(date);
    } else {
      setEndDate(date);
    }

    if (dateRangeEnabled) {
      setExportOptions(prev => ({
        ...prev,
        date_range: {
          start: type === 'start' ? date : startDate,
          end: type === 'end' ? date : endDate
        }
      }));
    }
  };

  const handleStartExport = useCallback(async () => {
    try {
      setIsExporting(true);
      setExportResult(null);

      const result = await window.electronAPI.fileExport.exportData(
        exportOptions,
        undefined, // Let user choose file path via dialog
        (progress: ExportProgress) => {
          setExportProgress(progress);
        }
      );

      setExportResult(result);
      onExportComplete?.(result);
    } catch (error) {
      setExportResult({
        success: false,
        error_message: error instanceof Error ? error.message : 'Unbekannter Fehler',
        exported_count: 0
      });
    } finally {
      setIsExporting(false);
    }
  }, [exportOptions, onExportComplete]);

  const getFormatDescription = (format: ExportFormat): string => {
    switch (format) {
      case 'ical':
        return 'iCal-Format für Kalender-Anwendungen (Outlook, Google Calendar, etc.)';
      case 'csv':
        return 'CSV-Format für Tabellenkalkulationen (Excel, LibreOffice Calc, etc.)';
      case 'pdf':
        return 'PDF-Format für Berichte und Präsentationen';
      case 'json':
        return 'JSON-Format für Backup und Datenübertragung';
      default:
        return '';
    }
  };

  const getFormatIcon = (format: ExportFormat) => {
    switch (format) {
      case 'ical':
        return (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                  d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
        );
      case 'csv':
        return (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                  d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
          </svg>
        );
      case 'pdf':
        return (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                  d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
        );
      case 'json':
        return (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                  d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
          </svg>
        );
    }
  };

  const resetDialog = () => {
    setExportResult(null);
    setIsExporting(false);
    setExportProgress({
      current_item: 0,
      total_items: 0,
      current_operation: '',
      percentage: 0
    });
  };

  const handleClose = () => {
    resetDialog();
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full m-4 max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="bg-green-600 text-white p-6">
          <div className="flex justify-between items-center">
            <h2 className="text-2xl font-bold">Daten exportieren</h2>
            <button
              onClick={handleClose}
              className="text-white hover:text-gray-200 transition-colors"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          <p className="mt-2 text-green-100">
            Exportieren Sie Ihre Daten in verschiedene Formate für weitere Verwendung.
          </p>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {!isExporting && !exportResult && (
            <div className="space-y-6">
              {/* Export Format Selection */}
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Export-Format wählen:</h3>
                <div className="grid grid-cols-1 gap-3">
                  {(['ical', 'csv', 'pdf', 'json'] as ExportFormat[]).map(format => (
                    <label key={format} className="cursor-pointer">
                      <div className={`border-2 rounded-lg p-4 transition-colors ${
                        exportOptions.format === format 
                          ? 'border-green-500 bg-green-50' 
                          : 'border-gray-200 hover:border-gray-300'
                      }`}>
                        <div className="flex items-center">
                          <input
                            type="radio"
                            name="format"
                            value={format}
                            checked={exportOptions.format === format}
                            onChange={(e) => handleExportOptionChange('format', e.target.value)}
                            className="mr-3"
                          />
                          <div className="flex items-center flex-1">
                            <div className="mr-3 text-green-600">
                              {getFormatIcon(format)}
                            </div>
                            <div>
                              <div className="font-semibold text-gray-900 uppercase">{format}</div>
                              <div className="text-sm text-gray-600">{getFormatDescription(format)}</div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </label>
                  ))}
                </div>
              </div>

              {/* Data Selection */}
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Daten zum Export auswählen:</h3>
                <div className="space-y-3">
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={exportOptions.include_assignments || false}
                      onChange={(e) => handleExportOptionChange('include_assignments', e.target.checked)}
                      className="mr-3"
                    />
                    <span className="text-gray-700">Zuweisungen einschließen</span>
                  </label>
                  
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={exportOptions.include_teachers || false}
                      onChange={(e) => handleExportOptionChange('include_teachers', e.target.checked)}
                      className="mr-3"
                    />
                    <span className="text-gray-700">Lehrer einschließen</span>
                  </label>
                  
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={exportOptions.include_courses || false}
                      onChange={(e) => handleExportOptionChange('include_courses', e.target.checked)}
                      className="mr-3"
                    />
                    <span className="text-gray-700">Kurse einschließen</span>
                  </label>
                </div>
              </div>

              {/* Date Range Selection */}
              <div>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-gray-900">Datumsbereich (optional):</h3>
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={dateRangeEnabled}
                      onChange={(e) => handleDateRangeToggle(e.target.checked)}
                      className="mr-2"
                    />
                    <span className="text-sm text-gray-600">Datumsbereich aktivieren</span>
                  </label>
                </div>
                
                {dateRangeEnabled && (
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Von:</label>
                      <input
                        type="date"
                        value={startDate}
                        onChange={(e) => handleDateChange('start', e.target.value)}
                        className="border border-gray-300 rounded-lg px-3 py-2 w-full"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Bis:</label>
                      <input
                        type="date"
                        value={endDate}
                        onChange={(e) => handleDateChange('end', e.target.value)}
                        className="border border-gray-300 rounded-lg px-3 py-2 w-full"
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Format-specific Options */}
              {exportOptions.format === 'ical' && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <div className="flex items-start">
                    <svg className="w-5 h-5 text-blue-600 mt-0.5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <div>
                      <h4 className="font-semibold text-blue-900">iCal Export-Hinweise:</h4>
                      <p className="text-sm text-blue-800 mt-1">
                        Der iCal-Export erstellt Kalendertermine für alle geplanten Unterrichtsstunden.
                        Diese können in Outlook, Google Calendar und andere Kalender-Anwendungen importiert werden.
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Export Progress */}
          {isExporting && (
            <div className="text-center py-8">
              <div className="animate-spin mx-auto h-16 w-16 border-4 border-green-600 border-t-transparent rounded-full mb-4"></div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Export wird durchgeführt...</h3>
              <p className="text-gray-600 mb-4">{exportProgress.current_operation}</p>
              
              <div className="max-w-md mx-auto">
                <div className="bg-gray-200 rounded-full h-3 mb-2">
                  <div 
                    className="bg-green-600 h-3 rounded-full transition-all duration-300" 
                    style={{ width: `${exportProgress.percentage}%` }}
                  ></div>
                </div>
                <div className="text-sm text-gray-600">
                  {exportProgress.percentage}% - {exportProgress.current_item} von {exportProgress.total_items}
                </div>
              </div>
            </div>
          )}

          {/* Export Result */}
          {exportResult && (
            <div className="text-center py-8">
              <div className={`mx-auto h-16 w-16 rounded-full flex items-center justify-center mb-4 ${
                exportResult.success ? 'bg-green-100' : 'bg-red-100'
              }`}>
                {exportResult.success ? (
                  <svg className="h-8 w-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                ) : (
                  <svg className="h-8 w-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                )}
              </div>
              
              <h3 className={`text-lg font-semibold mb-2 ${
                exportResult.success ? 'text-green-900' : 'text-red-900'
              }`}>
                {exportResult.success ? 'Export erfolgreich!' : 'Export fehlgeschlagen'}
              </h3>
              
              {exportResult.success ? (
                <div className="bg-green-50 rounded-lg p-4 max-w-md mx-auto">
                  <p className="text-green-800 mb-2">
                    {exportResult.exported_count} Einträge erfolgreich exportiert.
                  </p>
                  {exportResult.file_path && (
                    <p className="text-sm text-green-700 break-all">
                      Gespeichert unter: {exportResult.file_path}
                    </p>
                  )}
                </div>
              ) : (
                <div className="bg-red-50 rounded-lg p-4 max-w-md mx-auto">
                  <p className="text-red-800">
                    {exportResult.error_message}
                  </p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="bg-gray-50 px-6 py-4 flex justify-between">
          <div></div>
          <div className="flex space-x-3">
            {!isExporting && !exportResult && (
              <button
                onClick={handleStartExport}
                disabled={!exportOptions.include_assignments && !exportOptions.include_teachers && !exportOptions.include_courses}
                className="bg-green-600 text-white px-6 py-2 rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Export starten
              </button>
            )}
            
            {exportResult && (
              <button
                onClick={resetDialog}
                className="bg-gray-600 text-white px-4 py-2 rounded-lg hover:bg-gray-700 transition-colors mr-2"
              >
                Neuer Export
              </button>
            )}
            
            <button
              onClick={handleClose}
              className="bg-gray-300 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-400 transition-colors"
            >
              Schließen
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ExportDialog;