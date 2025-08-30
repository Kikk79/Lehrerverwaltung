import React, { useState, useEffect } from 'react';
import { SettingsService } from '../../../shared/services/SettingsService';

interface WeightingDefaults {
  equality: number;
  continuity: number;
  loyalty: number;
}

const WeightingDefaultsPanel: React.FC = () => {
  const [defaultWeights, setDefaultWeights] = useState<WeightingDefaults>({
    equality: 33,
    continuity: 33,
    loyalty: 34
  });
  const [tempWeights, setTempWeights] = useState<WeightingDefaults>({
    equality: 33,
    continuity: 33,
    loyalty: 34
  });
  const [isLoading, setIsLoading] = useState(false);
  const [isDirty, setIsDirty] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const settingsService = SettingsService.getInstance();

  useEffect(() => {
    loadDefaultWeights();
  }, []);

  useEffect(() => {
    // Check if weights have changed from saved defaults
    const hasChanged = (
      tempWeights.equality !== defaultWeights.equality ||
      tempWeights.continuity !== defaultWeights.continuity ||
      tempWeights.loyalty !== defaultWeights.loyalty
    );
    setIsDirty(hasChanged);
  }, [tempWeights, defaultWeights]);

  const loadDefaultWeights = async () => {
    try {
      setIsLoading(true);
      const weights = await settingsService.getDefaultWeights();
      setDefaultWeights(weights);
      setTempWeights(weights);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Fehler beim Laden der Standard-Gewichtungen');
    } finally {
      setIsLoading(false);
    }
  };

  const handleWeightChange = (type: keyof WeightingDefaults, value: number) => {
    const newWeights = { ...tempWeights, [type]: value };
    
    // Ensure weights sum to 100
    const total = newWeights.equality + newWeights.continuity + newWeights.loyalty;
    if (total !== 100) {
      // Adjust other weights proportionally
      const remaining = 100 - value;
      const otherTypes = Object.keys(newWeights).filter(key => key !== type) as Array<keyof WeightingDefaults>;
      const otherSum = otherTypes.reduce((sum, key) => sum + tempWeights[key], 0);
      
      if (otherSum > 0) {
        otherTypes.forEach(key => {
          newWeights[key] = Math.round((tempWeights[key] / otherSum) * remaining);
        });
        
        // Fix rounding errors
        const newTotal = Object.values(newWeights).reduce((sum, val) => sum + val, 0);
        const diff = 100 - newTotal;
        if (diff !== 0) {
          newWeights[otherTypes[0]] += diff;
        }
      }
    }
    
    setTempWeights(newWeights);
    setError(null);
  };

  const handleSaveDefaults = async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      await settingsService.setDefaultWeights(tempWeights);
      setDefaultWeights(tempWeights);
      setSuccessMessage('Standard-Gewichtungen erfolgreich gespeichert');
      
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Fehler beim Speichern der Standard-Gewichtungen');
    } finally {
      setIsLoading(false);
    }
  };

  const handleResetDefaults = () => {
    const resetWeights = { equality: 33, continuity: 33, loyalty: 34 };
    setTempWeights(resetWeights);
  };

  const handleDiscardChanges = () => {
    setTempWeights(defaultWeights);
    setError(null);
  };

  const getWeightDescription = (type: keyof WeightingDefaults): { title: string; description: string; icon: string } => {
    switch (type) {
      case 'equality':
        return {
          title: 'Gleichmäßigkeit',
          description: 'Verteilt die Arbeitsbelastung gleichmäßig auf alle Lehrer',
          icon: 'M3 6l3 1m0 0l-3 9a5.002 5.002 0 006.001 0M6 7l3 9M6 7l6-2m6 2l3-1m-3 1l-3 9a5.002 5.002 0 006.001 0M18 7l3 9m-3-9l-6-2m0-2v2m0 16V5m0 16H9m3 0h3'
        };
      case 'continuity':
        return {
          title: 'Kontinuität',
          description: 'Bevorzugt zusammenhängende Unterrichtsblöcke für einzelne Lehrer',
          icon: 'M13 10V3L4 14h7v7l9-11h-7z'
        };
      case 'loyalty':
        return {
          title: 'Lehrertreue',
          description: 'Hält Lehrer bei ihren gewohnten Fächern und Klassen',
          icon: 'M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z'
        };
    }
  };

  const getSliderColor = (type: keyof WeightingDefaults): string => {
    switch (type) {
      case 'equality': return 'blue';
      case 'continuity': return 'green'; 
      case 'loyalty': return 'purple';
    }
  };

  if (isLoading && !tempWeights) {
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

      {/* Header */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <div className="flex items-start justify-between mb-6">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">Standard-Gewichtungen</h3>
            <p className="text-sm text-gray-600 mt-1">
              Diese Werte werden als Ausgangspunkt für neue Zuweisungen verwendet. 
              Sie können jederzeit in der Zuweisung-Sektion angepasst werden.
            </p>
          </div>
          
          {isDirty && (
            <div className="flex items-center text-amber-600">
              <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
              <span className="text-xs font-medium">Nicht gespeicherte Änderungen</span>
            </div>
          )}
        </div>

        {/* Weight Sliders */}
        <div className="space-y-8">
          {(Object.keys(tempWeights) as Array<keyof WeightingDefaults>).map((type) => {
            const info = getWeightDescription(type);
            const color = getSliderColor(type);
            
            return (
              <div key={type} className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <svg className={`w-5 h-5 mr-3 text-${color}-600`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={info.icon} />
                    </svg>
                    <div>
                      <label className="text-sm font-medium text-gray-900">
                        {info.title}
                      </label>
                      <p className="text-xs text-gray-500">{info.description}</p>
                    </div>
                  </div>
                  <div className={`text-lg font-bold text-${color}-600 min-w-[60px] text-right`}>
                    {tempWeights[type]}%
                  </div>
                </div>
                
                <div className="relative">
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={tempWeights[type]}
                    onChange={(e) => handleWeightChange(type, parseInt(e.target.value))}
                    className={`w-full h-3 rounded-lg appearance-none cursor-pointer slider-${color}`}
                    style={{
                      background: `linear-gradient(to right, rgb(var(--color-${color}-500)) 0%, rgb(var(--color-${color}-500)) ${tempWeights[type]}%, rgb(229, 231, 235) ${tempWeights[type]}%, rgb(229, 231, 235) 100%)`
                    }}
                  />
                  <div className="flex justify-between text-xs text-gray-400 mt-1">
                    <span>0%</span>
                    <span>50%</span>
                    <span>100%</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Total Display */}
        <div className="mt-6 p-4 bg-gray-50 rounded-lg">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-gray-700">Gesamtsumme:</span>
            <span className={`text-lg font-bold ${
              (tempWeights.equality + tempWeights.continuity + tempWeights.loyalty) === 100 
                ? 'text-green-600' 
                : 'text-red-600'
            }`}>
              {tempWeights.equality + tempWeights.continuity + tempWeights.loyalty}%
            </span>
          </div>
          {(tempWeights.equality + tempWeights.continuity + tempWeights.loyalty) !== 100 && (
            <p className="text-xs text-red-500 mt-1">
              Die Gewichtungen müssen in der Summe 100% ergeben
            </p>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap gap-2 mt-6 justify-between">
          <div className="flex gap-2">
            <button
              onClick={handleResetDefaults}
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
            onClick={handleSaveDefaults}
            disabled={!isDirty || isLoading || (tempWeights.equality + tempWeights.continuity + tempWeights.loyalty) !== 100}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-blue-400 disabled:cursor-not-allowed transition-colors"
          >
            {isLoading ? 'Speichern...' : 'Standard-Gewichtungen speichern'}
          </button>
        </div>
      </div>

      {/* Usage Info */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex">
          <svg className="w-5 h-5 text-blue-600 mr-2 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
          </svg>
          <div>
            <h4 className="text-sm font-medium text-blue-900 mb-1">Verwendung der Standard-Gewichtungen</h4>
            <div className="text-sm text-blue-800 space-y-1">
              <p>• Diese Werte werden automatisch geladen, wenn Sie neue Zuweisungen erstellen</p>
              <p>• Sie können bei jeder Zuweisung individuell angepasst werden</p>
              <p>• Änderungen hier wirken sich nur auf zukünftige Zuweisungen aus</p>
              <p>• In Notfall-Situationen können Sie die Lehrertreue reduzieren für mehr Flexibilität</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default WeightingDefaultsPanel;