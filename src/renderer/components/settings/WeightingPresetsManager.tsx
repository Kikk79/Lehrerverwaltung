import React, { useState, useEffect } from 'react';
import { SettingsService } from '../../../shared/services/SettingsService';
import { WeightingSettings } from '../../../shared/types';

interface NewPreset {
  profile_name: string;
  equality_weight: number;
  continuity_weight: number;
  loyalty_weight: number;
}

const WeightingPresetsManager: React.FC = () => {
  const [presets, setPresets] = useState<WeightingSettings[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [editingPreset, setEditingPreset] = useState<WeightingSettings | null>(null);
  const [newPreset, setNewPreset] = useState<NewPreset>({
    profile_name: '',
    equality_weight: 33,
    continuity_weight: 33,
    loyalty_weight: 34
  });

  const settingsService = SettingsService.getInstance();

  useEffect(() => {
    loadPresets();
  }, []);

  const loadPresets = async () => {
    try {
      setIsLoading(true);
      const loadedPresets = await settingsService.getWeightingPresets();
      setPresets(loadedPresets);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Fehler beim Laden der Presets');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreatePreset = () => {
    setNewPreset({
      profile_name: '',
      equality_weight: 33,
      continuity_weight: 33,
      loyalty_weight: 34
    });
    setEditingPreset(null);
    setShowCreateDialog(true);
  };

  const handleEditPreset = (preset: WeightingSettings) => {
    setNewPreset({
      profile_name: preset.profile_name,
      equality_weight: preset.equality_weight,
      continuity_weight: preset.continuity_weight,
      loyalty_weight: preset.loyalty_weight
    });
    setEditingPreset(preset);
    setShowCreateDialog(true);
  };

  const handleSavePreset = async () => {
    try {
      setIsLoading(true);
      setError(null);

      // Validate preset name
      if (!newPreset.profile_name.trim()) {
        setError('Preset-Name ist erforderlich');
        return;
      }

      // Validate weights sum to 100
      const total = newPreset.equality_weight + newPreset.continuity_weight + newPreset.loyalty_weight;
      if (total !== 100) {
        setError('Gewichtungen müssen in der Summe 100% ergeben');
        return;
      }

      // Check for duplicate names (except when editing the same preset)
      const existingPreset = presets.find(p => 
        p.profile_name.toLowerCase() === newPreset.profile_name.toLowerCase().trim() &&
        p.id !== editingPreset?.id
      );
      if (existingPreset) {
        setError('Ein Preset mit diesem Namen existiert bereits');
        return;
      }

      await settingsService.saveWeightingPreset({
        profile_name: newPreset.profile_name.trim(),
        equality_weight: newPreset.equality_weight,
        continuity_weight: newPreset.continuity_weight,
        loyalty_weight: newPreset.loyalty_weight,
        is_default: false
      });

      await loadPresets();
      setShowCreateDialog(false);
      setSuccessMessage(editingPreset ? 'Preset erfolgreich aktualisiert' : 'Preset erfolgreich erstellt');
      setTimeout(() => setSuccessMessage(null), 3000);

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Fehler beim Speichern des Presets');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeletePreset = async (preset: WeightingSettings) => {
    if (!confirm(`Möchten Sie das Preset "${preset.profile_name}" wirklich löschen?`)) {
      return;
    }

    try {
      setIsLoading(true);
      setError(null);

      await settingsService.deleteWeightingPreset(preset.id);
      await loadPresets();
      
      setSuccessMessage('Preset erfolgreich gelöscht');
      setTimeout(() => setSuccessMessage(null), 3000);

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Fehler beim Löschen des Presets');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSetDefault = async (preset: WeightingSettings) => {
    try {
      setIsLoading(true);
      setError(null);

      await settingsService.setDefaultWeightingPreset(preset.id);
      await loadPresets();
      
      setSuccessMessage(`"${preset.profile_name}" als Standard-Preset festgelegt`);
      setTimeout(() => setSuccessMessage(null), 3000);

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Fehler beim Setzen des Standard-Presets');
    } finally {
      setIsLoading(false);
    }
  };

  const handleWeightChange = (type: keyof Omit<NewPreset, 'profile_name'>, value: number) => {
    const updatedPreset = { ...newPreset, [type]: value };
    
    // Auto-adjust other weights to maintain sum of 100
    const total = updatedPreset.equality_weight + updatedPreset.continuity_weight + updatedPreset.loyalty_weight;
    if (total !== 100) {
      const remaining = 100 - value;
      const otherKeys = Object.keys(updatedPreset).filter(key => key !== type && key !== 'profile_name') as Array<keyof Omit<NewPreset, 'profile_name'>>;
      const otherSum = otherKeys.reduce((sum, key) => sum + newPreset[key], 0);
      
      if (otherSum > 0) {
        otherKeys.forEach(key => {
          updatedPreset[key] = Math.round((newPreset[key] / otherSum) * remaining);
        });
        
        // Fix rounding errors
        const newTotal = updatedPreset.equality_weight + updatedPreset.continuity_weight + updatedPreset.loyalty_weight;
        const diff = 100 - newTotal;
        if (diff !== 0) {
          updatedPreset[otherKeys[0]] += diff;
        }
      }
    }
    
    setNewPreset(updatedPreset);
  };

  const getPresetTypeColor = (preset: WeightingSettings) => {
    const name = preset.profile_name.toLowerCase();
    if (name.includes('notfall') || name.includes('emergency')) return 'bg-red-100 text-red-800 border-red-200';
    if (name.includes('normal')) return 'bg-blue-100 text-blue-800 border-blue-200';
    if (name.includes('ausgewogen') || name.includes('balanced')) return 'bg-green-100 text-green-800 border-green-200';
    return 'bg-gray-100 text-gray-800 border-gray-200';
  };

  const getWeightBar = (weight: number, color: string) => (
    <div className="flex items-center space-x-2">
      <div className="w-16 h-2 bg-gray-200 rounded-full">
        <div 
          className={`h-2 ${color} rounded-full transition-all`} 
          style={{ width: `${weight}%` }}
        />
      </div>
      <span className="text-sm font-medium w-10">{weight}%</span>
    </div>
  );

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
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">Gewichtungs-Presets</h3>
          <p className="text-sm text-gray-600">Vordefinierte Gewichtungsprofile für verschiedene Szenarien</p>
        </div>
        <button
          onClick={handleCreatePreset}
          disabled={isLoading}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-blue-400 transition-colors"
        >
          Neues Preset
        </button>
      </div>

      {/* Presets List */}
      <div className="space-y-4">
        {presets.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-lg border border-gray-200">
            <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zM21 5a2 2 0 00-2-2h-4a2 2 0 00-2 2v12a4 4 0 004 4h4a2 2 0 002-2V5z" />
            </svg>
            <h3 className="mt-2 text-sm font-medium text-gray-900">Keine Presets vorhanden</h3>
            <p className="mt-1 text-sm text-gray-500">Erstellen Sie Ihr erstes Gewichtungs-Preset</p>
          </div>
        ) : (
          presets.map((preset) => (
            <div key={preset.id} className="bg-white border border-gray-200 rounded-lg p-6">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center space-x-3 mb-3">
                    <h4 className="text-lg font-semibold text-gray-900">{preset.profile_name}</h4>
                    {preset.is_default && (
                      <span className="px-2 py-1 text-xs font-medium bg-blue-100 text-blue-800 border border-blue-200 rounded-full">
                        Standard
                      </span>
                    )}
                    <span className={`px-2 py-1 text-xs font-medium border rounded-full ${getPresetTypeColor(preset)}`}>
                      Preset
                    </span>
                  </div>
                  
                  <div className="grid grid-cols-3 gap-4 mb-3">
                    <div>
                      <div className="text-sm font-medium text-gray-700 mb-1">Gleichmäßigkeit</div>
                      {getWeightBar(preset.equality_weight, 'bg-blue-500')}
                    </div>
                    <div>
                      <div className="text-sm font-medium text-gray-700 mb-1">Kontinuität</div>
                      {getWeightBar(preset.continuity_weight, 'bg-green-500')}
                    </div>
                    <div>
                      <div className="text-sm font-medium text-gray-700 mb-1">Lehrertreue</div>
                      {getWeightBar(preset.loyalty_weight, 'bg-purple-500')}
                    </div>
                  </div>

                  <div className="text-xs text-gray-500">
                    Erstellt am: {new Date(preset.created_at).toLocaleDateString('de-DE')}
                  </div>
                </div>

                <div className="flex items-center space-x-2 ml-4">
                  {!preset.is_default && (
                    <button
                      onClick={() => handleSetDefault(preset)}
                      disabled={isLoading}
                      className="px-3 py-1 text-xs bg-blue-100 text-blue-700 rounded hover:bg-blue-200 disabled:bg-blue-50 transition-colors"
                    >
                      Als Standard
                    </button>
                  )}
                  <button
                    onClick={() => handleEditPreset(preset)}
                    disabled={isLoading}
                    className="px-3 py-1 text-xs bg-gray-100 text-gray-700 rounded hover:bg-gray-200 disabled:bg-gray-50 transition-colors"
                  >
                    Bearbeiten
                  </button>
                  {/* Don't allow deletion of built-in presets */}
                  {!['Normal', 'Notfall', 'Ausgewogen'].includes(preset.profile_name) && (
                    <button
                      onClick={() => handleDeletePreset(preset)}
                      disabled={isLoading || preset.is_default}
                      className="px-3 py-1 text-xs bg-red-100 text-red-700 rounded hover:bg-red-200 disabled:bg-red-50 disabled:text-red-400 transition-colors"
                    >
                      Löschen
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Create/Edit Dialog */}
      {showCreateDialog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg max-w-2xl w-full mx-4 p-6 max-h-[90vh] overflow-y-auto">
            <h3 className="text-lg font-semibold text-gray-900 mb-6">
              {editingPreset ? 'Preset bearbeiten' : 'Neues Preset erstellen'}
            </h3>
            
            <div className="space-y-6">
              {/* Preset Name */}
              <div>
                <label htmlFor="presetName" className="block text-sm font-medium text-gray-700 mb-2">
                  Preset-Name
                </label>
                <input
                  type="text"
                  id="presetName"
                  value={newPreset.profile_name}
                  onChange={(e) => setNewPreset({ ...newPreset, profile_name: e.target.value })}
                  placeholder="z.B. Mein Custom Preset"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              {/* Weight Sliders */}
              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Gleichmäßigkeit: {newPreset.equality_weight}%
                  </label>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={newPreset.equality_weight}
                    onChange={(e) => handleWeightChange('equality_weight', parseInt(e.target.value))}
                    className="w-full h-2 bg-blue-200 rounded-lg appearance-none cursor-pointer slider-blue"
                  />
                  <p className="text-xs text-gray-500 mt-1">Verteilt Arbeitsbelastung gleichmäßig</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Kontinuität: {newPreset.continuity_weight}%
                  </label>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={newPreset.continuity_weight}
                    onChange={(e) => handleWeightChange('continuity_weight', parseInt(e.target.value))}
                    className="w-full h-2 bg-green-200 rounded-lg appearance-none cursor-pointer slider-green"
                  />
                  <p className="text-xs text-gray-500 mt-1">Bevorzugt zusammenhängende Unterrichtsblöcke</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Lehrertreue: {newPreset.loyalty_weight}%
                  </label>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={newPreset.loyalty_weight}
                    onChange={(e) => handleWeightChange('loyalty_weight', parseInt(e.target.value))}
                    className="w-full h-2 bg-purple-200 rounded-lg appearance-none cursor-pointer slider-purple"
                  />
                  <p className="text-xs text-gray-500 mt-1">Hält Lehrer bei gewohnten Fächern</p>
                </div>
              </div>

              {/* Total Display */}
              <div className="p-4 bg-gray-50 rounded-lg">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-gray-700">Gesamtsumme:</span>
                  <span className={`text-lg font-bold ${
                    (newPreset.equality_weight + newPreset.continuity_weight + newPreset.loyalty_weight) === 100 
                      ? 'text-green-600' 
                      : 'text-red-600'
                  }`}>
                    {newPreset.equality_weight + newPreset.continuity_weight + newPreset.loyalty_weight}%
                  </span>
                </div>
                {(newPreset.equality_weight + newPreset.continuity_weight + newPreset.loyalty_weight) !== 100 && (
                  <p className="text-xs text-red-500 mt-1">
                    Die Gewichtungen müssen in der Summe 100% ergeben
                  </p>
                )}
              </div>

              {/* Action Buttons */}
              <div className="flex justify-end space-x-3">
                <button
                  onClick={() => setShowCreateDialog(false)}
                  disabled={isLoading}
                  className="px-4 py-2 text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:bg-gray-50 transition-colors"
                >
                  Abbrechen
                </button>
                <button
                  onClick={handleSavePreset}
                  disabled={
                    isLoading || 
                    !newPreset.profile_name.trim() ||
                    (newPreset.equality_weight + newPreset.continuity_weight + newPreset.loyalty_weight) !== 100
                  }
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-blue-400 transition-colors"
                >
                  {isLoading ? 'Speichern...' : editingPreset ? 'Preset aktualisieren' : 'Preset erstellen'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Usage Info */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex">
          <svg className="w-5 h-5 text-blue-600 mr-2 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
          </svg>
          <div>
            <h4 className="text-sm font-medium text-blue-900 mb-1">Preset-Verwendung</h4>
            <div className="text-sm text-blue-800 space-y-1">
              <p>• <strong>Normal:</strong> Ausgewogene Gewichtung für den regulären Schulbetrieb</p>
              <p>• <strong>Notfall:</strong> Reduzierte Lehrertreue für flexiblere Zuweisungen bei Ausfällen</p>
              <p>• <strong>Ausgewogen:</strong> Mittlere Gewichtung aller Faktoren</p>
              <p>• Das Standard-Preset wird automatisch beim Erstellen neuer Zuweisungen geladen</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default WeightingPresetsManager;