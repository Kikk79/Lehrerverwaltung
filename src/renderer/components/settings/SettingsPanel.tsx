import React, { useState, useEffect } from 'react';
import AIConfigurationPanel from './AIConfigurationPanel';
import WeightingDefaultsPanel from './WeightingDefaultsPanel';
import DatabaseSettingsPanel from './DatabaseSettingsPanel';
import ApplicationPreferencesPanel from './ApplicationPreferencesPanel';
import WeightingPresetsManager from './WeightingPresetsManager';
import { SettingsService } from '../../../shared/services/SettingsService';

type SettingsTab = 'ai' | 'weighting' | 'presets' | 'database' | 'app';

const SettingsPanel: React.FC = () => {
  const [activeTab, setActiveTab] = useState<SettingsTab>('ai');
  const [isInitializing, setIsInitializing] = useState(false);

  const settingsService = SettingsService.getInstance();

  useEffect(() => {
    initializeSettings();
  }, []);

  const initializeSettings = async () => {
    try {
      setIsInitializing(true);
      await settingsService.initializeDefaults();
    } catch (error) {
      console.error('Failed to initialize settings:', error);
    } finally {
      setIsInitializing(false);
    }
  };

  const tabs = [
    {
      id: 'ai' as SettingsTab,
      name: 'KI-Konfiguration',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
      ),
      description: 'API-Schlüssel, Modellauswahl und System-Prompts'
    },
    {
      id: 'weighting' as SettingsTab,
      name: 'Standard-Gewichtungen',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                d="M3 6l3 1m0 0l-3 9a5.002 5.002 0 006.001 0M6 7l3 9M6 7l6-2m6 2l3-1m-3 1l-3 9a5.002 5.002 0 006.001 0M18 7l3 9m-3-9l-6-2m0-2v2m0 16V5m0 16H9m3 0h3" />
        </svg>
      ),
      description: 'Globale Standard-Werte für Zuweisungen'
    },
    {
      id: 'presets' as SettingsTab,
      name: 'Gewichtungs-Presets',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zM21 5a2 2 0 00-2-2h-4a2 2 0 00-2 2v12a4 4 0 004 4h4a2 2 0 002-2V5z" />
        </svg>
      ),
      description: 'Vordefinierte Profile für verschiedene Szenarien'
    },
    {
      id: 'database' as SettingsTab,
      name: 'Datenbankeinstellungen',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4" />
        </svg>
      ),
      description: 'Backup, Wiederherstellung und Datenexport'
    },
    {
      id: 'app' as SettingsTab,
      name: 'Anwendungseinstellungen',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 100 4m0-4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 100 4m0-4v2m0-6V4" />
        </svg>
      ),
      description: 'Theme, Sprache und allgemeine Einstellungen'
    }
  ];

  const renderActiveTabContent = () => {
    if (isInitializing) {
      return (
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Einstellungen werden initialisiert...</p>
          </div>
        </div>
      );
    }

    switch (activeTab) {
      case 'ai':
        return <AIConfigurationPanel />;
      case 'weighting':
        return <WeightingDefaultsPanel />;
      case 'presets':
        return <WeightingPresetsManager />;
      case 'database':
        return <DatabaseSettingsPanel />;
      case 'app':
        return <ApplicationPreferencesPanel />;
      default:
        return <AIConfigurationPanel />;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Einstellungen</h2>
        <p className="text-gray-600">Konfigurieren Sie die Anwendung nach Ihren Bedürfnissen</p>
      </div>

      {/* Tab Navigation */}
      <div className="bg-white rounded-lg shadow">
        <div className="border-b border-gray-200">
          <nav className="-mb-px flex space-x-8 px-6" aria-label="Tabs">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`${
                  activeTab === tab.id
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm flex items-center transition-colors`}
              >
                <span className="mr-2">{tab.icon}</span>
                {tab.name}
              </button>
            ))}
          </nav>
        </div>
        
        {/* Tab Description */}
        <div className="px-6 py-3 bg-gray-50">
          <p className="text-sm text-gray-600">
            {tabs.find(tab => tab.id === activeTab)?.description}
          </p>
        </div>

        {/* Tab Content */}
        <div className="p-6">
          {renderActiveTabContent()}
        </div>
      </div>
    </div>
  );
};

export default SettingsPanel;