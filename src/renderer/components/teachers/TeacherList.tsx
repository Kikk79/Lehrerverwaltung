import React from 'react';

const TeacherList: React.FC = () => {
  return (
    <div className="space-y-6">
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-2xl font-bold text-gray-900">Teachers</h2>
          <button className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors">
            Add Teacher
          </button>
        </div>
        
        <div className="border-4 border-dashed border-gray-200 rounded-lg h-96 flex items-center justify-center">
          <div className="text-center">
            <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                    d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
            </svg>
            <h3 className="mt-2 text-lg font-semibold text-gray-600">Teacher Management</h3>
            <p className="mt-1 text-gray-500">
              Teacher list and management functionality will be implemented here.
            </p>
            <div className="mt-4 text-sm text-gray-400">
              <p>Features to be implemented:</p>
              <ul className="mt-2 space-y-1">
                <li>• View all teachers</li>
                <li>• Add/edit teachers</li>
                <li>• Manage qualifications</li>
                <li>• Set availability</li>
                <li>• Import/export teachers</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TeacherList;