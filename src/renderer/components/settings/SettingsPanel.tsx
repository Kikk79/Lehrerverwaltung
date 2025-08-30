import React from 'react';

const SettingsPanel: React.FC = () => {
  return (
    <div className="space-y-6">
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-6">Settings</h2>
        
        <div className="space-y-6">
          {/* AI Configuration */}
          <div className="border-b border-gray-200 pb-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">AI Configuration</h3>
            <div className="border-4 border-dashed border-gray-200 rounded-lg h-48 flex items-center justify-center">
              <div className="text-center">
                <svg className="mx-auto h-8 w-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                        d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                <p className="mt-2 text-sm text-gray-500">API Key & Model Configuration</p>
                <ul className="mt-2 text-xs text-gray-400 space-y-1">
                  <li>• Anthropic API Key</li>
                  <li>• Model Selection (Haiku, Sonnet, Opus)</li>
                  <li>• System Prompts</li>
                  <li>• Usage Monitoring</li>
                </ul>
              </div>
            </div>
          </div>

          {/* Weighting Configuration */}
          <div className="border-b border-gray-200 pb-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Weighting Configuration</h3>
            <div className="border-4 border-dashed border-gray-200 rounded-lg h-48 flex items-center justify-center">
              <div className="text-center">
                <svg className="mx-auto h-8 w-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                        d="M3 6l3 1m0 0l-3 9a5.002 5.002 0 006.001 0M6 7l3 9M6 7l6-2m6 2l3-1m-3 1l-3 9a5.002 5.002 0 006.001 0M18 7l3 9m-3-9l-6-2m0-2v2m0 16V5m0 16H9m3 0h3" />
                </svg>
                <p className="mt-2 text-sm text-gray-500">Assignment Weighting Controls</p>
                <ul className="mt-2 text-xs text-gray-400 space-y-1">
                  <li>• Equality Weight (0-100%)</li>
                  <li>• Continuity Weight (0-100%)</li>
                  <li>• Loyalty Weight (0-100%)</li>
                  <li>• Weighting Presets</li>
                </ul>
              </div>
            </div>
          </div>

          {/* Database Settings */}
          <div className="border-b border-gray-200 pb-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Database Settings</h3>
            <div className="border-4 border-dashed border-gray-200 rounded-lg h-32 flex items-center justify-center">
              <div className="text-center">
                <svg className="mx-auto h-8 w-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                        d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4" />
                </svg>
                <p className="mt-2 text-sm text-gray-500">Database Management</p>
                <ul className="mt-2 text-xs text-gray-400 space-y-1">
                  <li>• Backup & Restore</li>
                  <li>• Clear Data</li>
                  <li>• Import/Export</li>
                </ul>
              </div>
            </div>
          </div>

          {/* Application Settings */}
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Application Settings</h3>
            <div className="border-4 border-dashed border-gray-200 rounded-lg h-32 flex items-center justify-center">
              <div className="text-center">
                <svg className="mx-auto h-8 w-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                        d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 100 4m0-4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 100 4m0-4v2m0-6V4" />
                </svg>
                <p className="mt-2 text-sm text-gray-500">General Preferences</p>
                <ul className="mt-2 text-xs text-gray-400 space-y-1">
                  <li>• Theme Settings</li>
                  <li>• Auto-updates</li>
                  <li>• Notifications</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SettingsPanel;