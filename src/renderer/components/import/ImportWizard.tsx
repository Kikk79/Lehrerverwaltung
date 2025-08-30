import React, { useState, useCallback } from 'react';
import { CSVImportPreview, CSVImportOptions, ImportProgress } from '../../../shared/services/FileImportService';
import { ImportResult } from '../../../shared/types';

interface ImportWizardProps {
  isOpen: boolean;
  onClose: () => void;
  onImportComplete?: (result: ImportResult) => void;
}

type ImportStep = 'file-selection' | 'preview-mapping' | 'import-progress' | 'complete';

const ImportWizard: React.FC<ImportWizardProps> = ({ isOpen, onClose, onImportComplete }) => {
  const [currentStep, setCurrentStep] = useState<ImportStep>('file-selection');
  const [selectedFile, setSelectedFile] = useState<string | null>(null);
  const [preview, setPreview] = useState<CSVImportPreview | null>(null);
  const [importOptions, setImportOptions] = useState<CSVImportOptions>({
    file_path: '',
    data_type: 'teachers',
    column_mapping: {},
    skip_header: true,
    delimiter: ','
  });
  const [importProgress, setImportProgress] = useState<ImportProgress>({
    current_row: 0,
    total_rows: 0,
    processed: 0,
    errors: 0,
    percentage: 0
  });
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  const handleFileSelection = useCallback(async () => {
    try {
      const filePath = await window.electronAPI.fileImport.showFilePickerDialog();
      if (filePath) {
        setSelectedFile(filePath);
        setIsProcessing(true);
        
        // Parse CSV and get preview with AI suggestions
        const csvPreview = await window.electronAPI.fileImport.parseCSVFile(filePath);
        setPreview(csvPreview);
        
        // Update import options
        setImportOptions(prev => ({
          ...prev,
          file_path: filePath,
          data_type: csvPreview.detected_type || 'teachers',
          column_mapping: csvPreview.suggested_mapping
        }));
        
        setCurrentStep('preview-mapping');
      }
    } catch (error) {
      alert(`Fehler beim Laden der Datei: ${error}`);
    } finally {
      setIsProcessing(false);
    }
  }, []);

  const handleColumnMappingChange = (csvHeader: string, dbField: string) => {
    setImportOptions(prev => ({
      ...prev,
      column_mapping: {
        ...prev.column_mapping,
        [csvHeader]: dbField
      }
    }));
  };

  const handleDataTypeChange = (dataType: 'teachers' | 'courses' | 'assignments') => {
    setImportOptions(prev => ({
      ...prev,
      data_type: dataType
    }));
  };

  const handleStartImport = async () => {
    if (!preview) return;
    
    try {
      setCurrentStep('import-progress');
      setIsProcessing(true);
      
      const result = await window.electronAPI.fileImport.performBatchImport(
        importOptions,
        (progress: ImportProgress) => {
          setImportProgress(progress);
        }
      );
      
      setImportResult(result);
      setCurrentStep('complete');
      onImportComplete?.(result);
    } catch (error) {
      alert(`Import fehlgeschlagen: ${error}`);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleRestart = () => {
    setCurrentStep('file-selection');
    setSelectedFile(null);
    setPreview(null);
    setImportResult(null);
    setImportProgress({
      current_row: 0,
      total_rows: 0,
      processed: 0,
      errors: 0,
      percentage: 0
    });
  };

  const getAvailableFields = () => {
    switch (importOptions.data_type) {
      case 'teachers':
        return ['name', 'qualifications', 'working_times'];
      case 'courses':
        return ['topic', 'lessons_count', 'lesson_duration', 'start_date', 'end_date'];
      case 'assignments':
        return ['teacher_id', 'course_id', 'status', 'ai_rationale'];
      default:
        return [];
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full m-4 max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="bg-blue-600 text-white p-6">
          <div className="flex justify-between items-center">
            <h2 className="text-2xl font-bold">CSV Import Assistent</h2>
            <button
              onClick={onClose}
              className="text-white hover:text-gray-200 transition-colors"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          
          {/* Progress Steps */}
          <div className="mt-4 flex items-center space-x-4">
            <div className={`flex items-center ${currentStep === 'file-selection' ? 'text-yellow-200' : 'text-blue-200'}`}>
              <span className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold mr-2 ${
                currentStep === 'file-selection' ? 'bg-yellow-200 text-blue-600' : 
                ['preview-mapping', 'import-progress', 'complete'].includes(currentStep) ? 'bg-green-200 text-green-800' : 'bg-blue-500'
              }`}>1</span>
              Datei auswählen
            </div>
            <div className={`flex items-center ${currentStep === 'preview-mapping' ? 'text-yellow-200' : 'text-blue-200'}`}>
              <span className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold mr-2 ${
                currentStep === 'preview-mapping' ? 'bg-yellow-200 text-blue-600' : 
                ['import-progress', 'complete'].includes(currentStep) ? 'bg-green-200 text-green-800' : 'bg-blue-500'
              }`}>2</span>
              Spalten zuordnen
            </div>
            <div className={`flex items-center ${currentStep === 'import-progress' ? 'text-yellow-200' : 'text-blue-200'}`}>
              <span className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold mr-2 ${
                currentStep === 'import-progress' ? 'bg-yellow-200 text-blue-600' : 
                currentStep === 'complete' ? 'bg-green-200 text-green-800' : 'bg-blue-500'
              }`}>3</span>
              Import durchführen
            </div>
            <div className={`flex items-center ${currentStep === 'complete' ? 'text-yellow-200' : 'text-blue-200'}`}>
              <span className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold mr-2 ${
                currentStep === 'complete' ? 'bg-green-200 text-green-800' : 'bg-blue-500'
              }`}>4</span>
              Abgeschlossen
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {/* Step 1: File Selection */}
          {currentStep === 'file-selection' && (
            <div className="text-center">
              <div className="mb-8">
                <svg className="mx-auto h-24 w-24 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} 
                        d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                </svg>
                <h3 className="mt-4 text-lg font-semibold text-gray-900">CSV-Datei für Import auswählen</h3>
                <p className="mt-2 text-gray-600">
                  Wählen Sie eine CSV-Datei aus, die Lehrer-, Kurs- oder Zuweisungsdaten enthält.
                  Die KI wird die Spalten automatisch analysieren und Zuordnungsvorschläge machen.
                </p>
              </div>
              
              <button
                onClick={handleFileSelection}
                disabled={isProcessing}
                className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isProcessing ? (
                  <>
                    <div className="animate-spin inline-block w-4 h-4 border-2 border-current border-t-transparent rounded-full mr-2"></div>
                    Datei wird analysiert...
                  </>
                ) : (
                  'CSV-Datei auswählen'
                )}
              </button>
            </div>
          )}

          {/* Step 2: Preview and Mapping */}
          {currentStep === 'preview-mapping' && preview && (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Datei-Vorschau und Spaltenzuordnung</h3>
                <div className="bg-gray-50 rounded-lg p-4 mb-4">
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div><strong>Datei:</strong> {selectedFile}</div>
                    <div><strong>Zeilen:</strong> {preview.total_rows}</div>
                    <div><strong>Erkannter Typ:</strong> {preview.detected_type || 'Unbekannt'}</div>
                    <div><strong>Spalten:</strong> {preview.headers.length}</div>
                  </div>
                </div>
              </div>

              {/* Data Type Selection */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Datentyp:</label>
                <select
                  value={importOptions.data_type}
                  onChange={(e) => handleDataTypeChange(e.target.value as any)}
                  className="border border-gray-300 rounded-lg px-3 py-2 w-full"
                >
                  <option value="teachers">Lehrer</option>
                  <option value="courses">Kurse</option>
                  <option value="assignments">Zuweisungen</option>
                </select>
              </div>

              {/* AI Suggestions */}
              {preview.ai_suggestions.length > 0 && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <h4 className="font-semibold text-blue-900 mb-2">KI-Empfehlungen:</h4>
                  <ul className="space-y-1 text-sm text-blue-800">
                    {preview.ai_suggestions.map((suggestion: string, index: number) => (
                      <li key={index} className="flex items-start">
                        <span className="text-blue-600 mr-2">•</span>
                        {suggestion}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Column Mapping */}
              <div>
                <h4 className="font-semibold text-gray-900 mb-3">Spaltenzuordnung:</h4>
                <div className="grid grid-cols-1 gap-4">
                  {preview.headers.map((header, index) => (
                    <div key={header} className="flex items-center space-x-4">
                      <div className="w-1/3">
                        <span className="text-sm font-medium text-gray-700">{header}</span>
                      </div>
                      <div className="w-1/3">
                        <select
                          value={importOptions.column_mapping[header] || ''}
                          onChange={(e) => handleColumnMappingChange(header, e.target.value)}
                          className="border border-gray-300 rounded px-3 py-1 w-full text-sm"
                        >
                          <option value="">-- Nicht zuordnen --</option>
                          {getAvailableFields().map(field => (
                            <option key={field} value={field}>{field}</option>
                          ))}
                        </select>
                      </div>
                      <div className="w-1/3 text-xs text-gray-600">
                        {preview.sample_rows[0]?.[index] ? 
                          `Beispiel: "${preview.sample_rows[0][index]}"` : 
                          'Kein Beispiel verfügbar'
                        }
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Data Preview Table */}
              <div>
                <h4 className="font-semibold text-gray-900 mb-3">Datenvorschau:</h4>
                <div className="overflow-x-auto">
                  <table className="min-w-full border border-gray-300 text-xs">
                    <thead className="bg-gray-50">
                      <tr>
                        {preview.headers.map(header => (
                          <th key={header} className="border border-gray-300 px-2 py-1 text-left font-medium">
                            {header}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {preview.sample_rows.slice(0, 5).map((row, rowIndex) => (
                        <tr key={rowIndex} className={rowIndex % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                          {row.map((cell, cellIndex) => (
                            <td key={cellIndex} className="border border-gray-300 px-2 py-1">
                              {cell}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* Step 3: Import Progress */}
          {currentStep === 'import-progress' && (
            <div className="text-center">
              <div className="mb-8">
                <div className="animate-spin mx-auto h-16 w-16 border-4 border-blue-600 border-t-transparent rounded-full"></div>
                <h3 className="mt-4 text-lg font-semibold text-gray-900">Import wird durchgeführt...</h3>
                <p className="mt-2 text-gray-600">Bitte warten Sie, während die Daten importiert werden.</p>
              </div>
              
              <div className="max-w-md mx-auto">
                <div className="bg-gray-200 rounded-full h-4 mb-4">
                  <div 
                    className="bg-blue-600 h-4 rounded-full transition-all duration-300" 
                    style={{ width: `${importProgress.percentage}%` }}
                  ></div>
                </div>
                
                <div className="grid grid-cols-2 gap-4 text-sm text-gray-600">
                  <div>Fortschritt: {importProgress.percentage}%</div>
                  <div>Zeile: {importProgress.current_row} von {importProgress.total_rows}</div>
                  <div>Verarbeitet: {importProgress.processed}</div>
                  <div>Fehler: {importProgress.errors}</div>
                </div>
              </div>
            </div>
          )}

          {/* Step 4: Complete */}
          {currentStep === 'complete' && importResult && (
            <div className="text-center">
              <div className="mb-8">
                <div className={`mx-auto h-16 w-16 rounded-full flex items-center justify-center ${
                  importResult.success ? 'bg-green-100' : 'bg-red-100'
                }`}>
                  {importResult.success ? (
                    <svg className="h-8 w-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  ) : (
                    <svg className="h-8 w-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  )}
                </div>
                
                <h3 className={`mt-4 text-lg font-semibold ${
                  importResult.success ? 'text-green-900' : 'text-red-900'
                }`}>
                  {importResult.success ? 'Import erfolgreich!' : 'Import mit Fehlern abgeschlossen'}
                </h3>
              </div>

              <div className="bg-gray-50 rounded-lg p-6 max-w-md mx-auto">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div><strong>Erfolgreich importiert:</strong></div>
                  <div className="text-green-600 font-semibold">{importResult.imported_count}</div>
                  
                  <div><strong>Übersprungen:</strong></div>
                  <div className="text-yellow-600 font-semibold">{importResult.skipped_count}</div>
                  
                  <div><strong>Fehler:</strong></div>
                  <div className="text-red-600 font-semibold">{importResult.errors.length}</div>
                </div>

                {importResult.errors.length > 0 && (
                  <div className="mt-4">
                    <h4 className="font-semibold text-red-900 mb-2">Fehlerdetails:</h4>
                    <div className="max-h-32 overflow-y-auto space-y-1 text-xs text-red-700">
                      {importResult.errors.slice(0, 10).map((error, index) => (
                        <div key={index}>
                          Zeile {error.row}: {error.message}
                        </div>
                      ))}
                      {importResult.errors.length > 10 && (
                        <div className="text-red-500">... und {importResult.errors.length - 10} weitere Fehler</div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="bg-gray-50 px-6 py-4 flex justify-between">
          <div>
            {currentStep === 'complete' && (
              <button
                onClick={handleRestart}
                className="bg-gray-600 text-white px-4 py-2 rounded-lg hover:bg-gray-700 transition-colors"
              >
                Neuen Import starten
              </button>
            )}
          </div>
          
          <div className="flex space-x-3">
            {currentStep === 'preview-mapping' && (
              <button
                onClick={handleStartImport}
                className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors"
              >
                Import starten
              </button>
            )}
            
            {currentStep === 'complete' && (
              <button
                onClick={onClose}
                className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
              >
                Schließen
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ImportWizard;