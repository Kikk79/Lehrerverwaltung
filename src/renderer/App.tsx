import React from 'react';

const App: React.FC = () => {
  return (
    <div className="min-h-screen bg-gray-100">
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <h1 className="text-2xl font-bold text-gray-900">
              Teacher Course Assignment
            </h1>
            <div className="text-sm text-gray-500">
              AI-Powered Course Assignment System
            </div>
          </div>
        </div>
      </header>
      
      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          <div className="border-4 border-dashed border-gray-200 rounded-lg h-96 flex items-center justify-center">
            <div className="text-center">
              <h2 className="text-xl font-semibold text-gray-600 mb-2">
                Welcome to Teacher Course Assignment
              </h2>
              <p className="text-gray-500">
                Your AI-powered desktop application for optimal teacher-course assignments
              </p>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default App;