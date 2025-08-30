import React from 'react';

const AssignmentList: React.FC = () => {
  return (
    <div className="space-y-6">
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-2xl font-bold text-gray-900">Assignments</h2>
          <div className="flex space-x-2">
            <button className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors">
              Generate Assignments
            </button>
            <button className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors">
              View Calendar
            </button>
          </div>
        </div>
        
        <div className="border-4 border-dashed border-gray-200 rounded-lg h-96 flex items-center justify-center">
          <div className="text-center">
            <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                    d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
            </svg>
            <h3 className="mt-2 text-lg font-semibold text-gray-600">Assignment Management</h3>
            <p className="mt-1 text-gray-500">
              Assignment visualization and management functionality will be implemented here.
            </p>
            <div className="mt-4 text-sm text-gray-400">
              <p>Features to be implemented:</p>
              <ul className="mt-2 space-y-1">
                <li>• AI-powered assignment generation</li>
                <li>• View assignment results</li>
                <li>• Interactive calendar view</li>
                <li>• Conflict resolution</li>
                <li>• Weighting controls</li>
                <li>• Assignment details and rationale</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AssignmentList;