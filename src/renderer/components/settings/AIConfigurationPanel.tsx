import React, { useState, useEffect } from 'react';
import { SettingsService } from '../../../shared/services/SettingsService';
import { ModelSelectionService } from '../../../shared/services/ModelSelectionService';
import { SystemPromptService } from '../../../shared/services/SystemPromptService';

interface ModelInfo {
  id: string;
  name: string;
  description: string;
  tier: string;
  recommended_for: string[];
  limitations: string[];
}

const AIConfigurationPanel: React.FC = () => {
  const [apiKey, setApiKey] = useState<string>('');
  const [selectedModel, setSelectedModel] = useState<string>('');
  const [availableModels, setAvailableModels] = useState<ModelInfo[]>([]);
  const [systemPrompts, setSystemPrompts] = useState<any[]>([]);
  const [selectedPromptType, setSelectedPromptType] = useState<string>('assignment_optimization');
  const [customPrompt, setCustomPrompt] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<'untested' | 'testing' | 'success' | 'error'>('untested');
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const settingsService = SettingsService.getInstance();
  const modelService = new ModelSelectionService();
  const promptService = new SystemPromptService();

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      setIsLoading(true);
      
      // Load API key (show masked version)
      const savedApiKey = await settingsService.getApiKey();
      setApiKey(savedApiKey ? '••••••••••••••••••••' + savedApiKey.slice(-4) : '');
      
      // Load selected model
      const model = await settingsService.getSelectedModel();
      setSelectedModel(model);
      
      // Load available models
      const models = modelService.getAvailableModels();
      setAvailableModels(models);
      
      // Load system prompts
      const prompts = promptService.getAvailablePrompts();
      setSystemPrompts(prompts);
      
      // Load custom prompt for selected type
      const customPromptText = await settingsService.getSystemPrompt(selectedPromptType);
      setCustomPrompt(customPromptText || '');
      
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Fehler beim Laden der Einstellungen');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveApiKey = async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      if (!apiKey || apiKey.includes('••••')) {
        setError('Bitte geben Sie einen gültigen API-Schlüssel ein');
        return;
      }
      
      await settingsService.setApiKey(apiKey);
      setSuccessMessage('API-Schlüssel erfolgreich gespeichert');
      
      // Mask the API key for display
      setApiKey('••••••••••••••••••••' + apiKey.slice(-4));
      
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Fehler beim Speichern des API-Schlüssels');
    } finally {
      setIsLoading(false);
    }
  };

  const handleTestConnection = async () => {
    try {
      setConnectionStatus('testing');
      setError(null);
      
      const result = await settingsService.testApiConnection();
      setConnectionStatus(result ? 'success' : 'error');
      
      if (!result) {
        setError('Verbindung zum API-Service fehlgeschlagen');
      }
    } catch (err) {
      setConnectionStatus('error');
      setError(err instanceof Error ? err.message : 'Verbindungstest fehlgeschlagen');
    }
  };

  const handleModelChange = async (modelId: string) => {
    try {
      setIsLoading(true);
      await settingsService.setSelectedModel(modelId);
      setSelectedModel(modelId);
      setSuccessMessage('AI-Modell erfolgreich aktualisiert');
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Fehler beim Aktualisieren des AI-Modells');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveCustomPrompt = async () => {
    try {
      setIsLoading(true);
      await settingsService.setSystemPrompt(selectedPromptType, customPrompt);
      setSuccessMessage('System-Prompt erfolgreich gespeichert');
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Fehler beim Speichern des System-Prompts');
    } finally {
      setIsLoading(false);
    }
  };

  const handlePromptTypeChange = async (promptType: string) => {
    setSelectedPromptType(promptType);
    
    // Load custom prompt for the new type
    const customPromptText = await settingsService.getSystemPrompt(promptType);
    const defaultPrompt = systemPrompts.find(p => p.type === promptType);
    setCustomPrompt(customPromptText || defaultPrompt?.template || '');
  };

  const getConnectionStatusColor = () => {
    switch (connectionStatus) {
      case 'success': return 'text-green-600 bg-green-100';
      case 'error': return 'text-red-600 bg-red-100';
      case 'testing': return 'text-yellow-600 bg-yellow-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const getConnectionStatusText = () => {
    switch (connectionStatus) {
      case 'success': return 'Verbindung erfolgreich';
      case 'error': return 'Verbindung fehlgeschlagen';
      case 'testing': return 'Teste Verbindung...';
      default: return 'Nicht getestet';
    }
  };

  if (isLoading && !apiKey && !selectedModel) {
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

      {/* API Key Configuration */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">API-Schlüssel Konfiguration</h3>
        
        <div className="space-y-4">
          <div>
            <label htmlFor="apiKey" className="block text-sm font-medium text-gray-700 mb-2">
              Anthropic API-Schlüssel
            </label>
            <div className="flex space-x-2">
              <input
                type="password"
                id="apiKey"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder="sk-ant-api03-..."
                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
              <button
                onClick={handleSaveApiKey}
                disabled={isLoading}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-blue-400 whitespace-nowrap"
              >
                {isLoading ? 'Speichern...' : 'Speichern'}
              </button>
            </div>
            <p className="text-xs text-gray-500 mt-1">
              Ihr API-Schlüssel wird verschlüsselt lokal gespeichert
            </p>
          </div>

          {/* Connection Status */}
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <div className={`px-2 py-1 rounded text-xs font-medium ${getConnectionStatusColor()}`}>
                {getConnectionStatusText()}
              </div>
            </div>
            <button
              onClick={handleTestConnection}
              disabled={connectionStatus === 'testing' || !apiKey || apiKey.includes('••••')}
              className="px-3 py-1 text-sm bg-gray-100 text-gray-700 rounded hover:bg-gray-200 disabled:bg-gray-50 disabled:text-gray-400"
            >
              {connectionStatus === 'testing' ? 'Teste...' : 'Verbindung testen'}
            </button>
          </div>
        </div>
      </div>

      {/* Model Selection */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">AI-Modell Auswahl</h3>
        
        <div className="space-y-4">
          {availableModels.map((model) => (
            <div 
              key={model.id}
              className={`border rounded-lg p-4 cursor-pointer transition-colors ${
                selectedModel === model.id 
                  ? 'border-blue-500 bg-blue-50' 
                  : 'border-gray-200 hover:border-gray-300'
              }`}
              onClick={() => handleModelChange(model.id)}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center">
                    <input
                      type="radio"
                      checked={selectedModel === model.id}
                      onChange={() => handleModelChange(model.id)}
                      className="mr-3"
                    />
                    <h4 className="text-base font-semibold text-gray-900">{model.name}</h4>
                    <span className={`ml-2 px-2 py-1 text-xs font-medium rounded ${
                      model.tier === 'haiku' ? 'bg-green-100 text-green-800' :
                      model.tier === 'sonnet' ? 'bg-blue-100 text-blue-800' :
                      'bg-purple-100 text-purple-800'
                    }`}>
                      {model.tier.charAt(0).toUpperCase() + model.tier.slice(1)}
                    </span>
                  </div>
                  <p className="text-sm text-gray-600 mt-1">{model.description}</p>
                  
                  <div className="mt-2 grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <p className="text-xs font-medium text-gray-700 mb-1">Empfohlen für:</p>
                      <ul className="text-xs text-gray-600 space-y-0.5">
                        {model.recommended_for.map((item, index) => (
                          <li key={index}>• {item}</li>
                        ))}
                      </ul>
                    </div>
                    <div>
                      <p className="text-xs font-medium text-gray-700 mb-1">Einschränkungen:</p>
                      <ul className="text-xs text-gray-600 space-y-0.5">
                        {model.limitations.map((item, index) => (
                          <li key={index}>• {item}</li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* System Prompt Editor */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">System-Prompt Editor</h3>
        
        <div className="space-y-4">
          <div>
            <label htmlFor="promptType" className="block text-sm font-medium text-gray-700 mb-2">
              Prompt-Typ auswählen
            </label>
            <select
              id="promptType"
              value={selectedPromptType}
              onChange={(e) => handlePromptTypeChange(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              {systemPrompts.map((prompt) => (
                <option key={prompt.type} value={prompt.type}>
                  {prompt.name} - {prompt.description}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="customPrompt" className="block text-sm font-medium text-gray-700 mb-2">
              Custom System Prompt
            </label>
            <textarea
              id="customPrompt"
              value={customPrompt}
              onChange={(e) => setCustomPrompt(e.target.value)}
              placeholder="Geben Sie hier Ihren benutzerdefinierten System-Prompt ein..."
              rows={12}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 font-mono text-sm"
            />
            <p className="text-xs text-gray-500 mt-1">
              Leer lassen, um den Standard-Prompt zu verwenden
            </p>
          </div>

          <div className="flex justify-end">
            <button
              onClick={handleSaveCustomPrompt}
              disabled={isLoading}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-blue-400"
            >
              {isLoading ? 'Speichern...' : 'Prompt Speichern'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AIConfigurationPanel;