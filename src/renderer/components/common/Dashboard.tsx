import React, { useEffect, useState } from 'react';
import { Teacher, Course, Assignment } from '../../../shared/types';

interface DashboardStats {
  teacherCount: number;
  courseCount: number;
  assignmentCount: number;
  conflictCount: number;
}

const Dashboard: React.FC = () => {
  const [stats, setStats] = useState<DashboardStats>({
    teacherCount: 0,
    courseCount: 0,
    assignmentCount: 0,
    conflictCount: 0
  });

  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDashboardStats();
  }, []);

  const loadDashboardStats = async () => {
    try {
      setLoading(true);
      
      // Load basic counts from database
      const [teachers, courses, assignments] = await Promise.all([
        window.electronAPI.database.getAllTeachers(),
        window.electronAPI.database.getAllCourses(),
        window.electronAPI.database.getAllAssignments()
      ]);

      // Calculate conflict count (placeholder logic)
      const conflictCount = 0; // TODO: Implement conflict detection

      setStats({
        teacherCount: teachers.length,
        courseCount: courses.length,
        assignmentCount: assignments.length,
        conflictCount
      });
    } catch (error) {
      console.error('Failed to load dashboard stats:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateAssignments = async () => {
    try {
      setLoading(true);
      
      // Check if we have teachers and courses
      if (stats.teacherCount === 0) {
        alert('Please add teachers before generating assignments');
        return;
      }
      
      if (stats.courseCount === 0) {
        alert('Please add courses before generating assignments');
        return;
      }

      // Generate assignments with default weights
      const assignmentResults = await window.electronAPI.assignment.generate();
      
      if (assignmentResults.length === 0) {
        alert('No assignments could be generated. Please ensure teachers have qualifications that match course topics exactly.');
        return;
      }

      // Show success message with summary
      alert(`Successfully generated ${assignmentResults.length} assignments! Check the Assignments tab to view results.`);
      
      // Refresh stats
      await loadDashboardStats();
      
    } catch (error) {
      console.error('Failed to generate assignments:', error);
      alert('Failed to generate assignments: ' + (error instanceof Error ? error.message : 'Unknown error'));
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Welcome Section */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">
          Welcome to Teacher Course Assignment
        </h2>
        <p className="text-gray-600">
          Your AI-powered desktop application for optimal teacher-course assignments.
          Manage your teachers, courses, and let AI handle the complex assignment optimization.
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="p-3 rounded-full bg-blue-100 mr-4">
              <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                      d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
              </svg>
            </div>
            <div>
              <p className="text-2xl font-semibold text-gray-900">{stats.teacherCount}</p>
              <p className="text-gray-600">Teachers</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="p-3 rounded-full bg-green-100 mr-4">
              <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                      d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
              </svg>
            </div>
            <div>
              <p className="text-2xl font-semibold text-gray-900">{stats.courseCount}</p>
              <p className="text-gray-600">Courses</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="p-3 rounded-full bg-purple-100 mr-4">
              <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                      d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
              </svg>
            </div>
            <div>
              <p className="text-2xl font-semibold text-gray-900">{stats.assignmentCount}</p>
              <p className="text-gray-600">Assignments</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className={`p-3 rounded-full mr-4 ${stats.conflictCount > 0 ? 'bg-red-100' : 'bg-gray-100'}`}>
              <svg className={`w-6 h-6 ${stats.conflictCount > 0 ? 'text-red-600' : 'text-gray-600'}`} 
                   fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                      d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
            </div>
            <div>
              <p className="text-2xl font-semibold text-gray-900">{stats.conflictCount}</p>
              <p className="text-gray-600">Conflicts</p>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* AI Assignment Generation */}
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">AI Assignment Generation</h3>
          <p className="text-gray-600 mb-4">
            Use our AI-powered algorithm to automatically generate optimal teacher-course assignments
            based on qualifications, availability, and workload balancing.
          </p>
          <button 
            onClick={handleGenerateAssignments}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
          >
            Generate Assignments
          </button>
        </div>

        {/* Recent Activity */}
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Recent Activity</h3>
          <div className="space-y-3">
            {stats.teacherCount === 0 && stats.courseCount === 0 ? (
              <div className="text-center py-4">
                <p className="text-gray-500 mb-2">No activity yet</p>
                <p className="text-sm text-gray-400">
                  Start by adding teachers and courses
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                <div className="flex items-center text-sm">
                  <div className="w-2 h-2 bg-green-400 rounded-full mr-3"></div>
                  <span className="text-gray-600">Database initialized</span>
                </div>
                {stats.teacherCount > 0 && (
                  <div className="flex items-center text-sm">
                    <div className="w-2 h-2 bg-blue-400 rounded-full mr-3"></div>
                    <span className="text-gray-600">{stats.teacherCount} teachers loaded</span>
                  </div>
                )}
                {stats.courseCount > 0 && (
                  <div className="flex items-center text-sm">
                    <div className="w-2 h-2 bg-purple-400 rounded-full mr-3"></div>
                    <span className="text-gray-600">{stats.courseCount} courses loaded</span>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Getting Started */}
      {stats.teacherCount === 0 || stats.courseCount === 0 ? (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-blue-900 mb-2">Getting Started</h3>
          <p className="text-blue-700 mb-4">
            To begin using the AI assignment system, you'll need to:
          </p>
          <div className="space-y-2 text-sm text-blue-700">
            <div className="flex items-center">
              <span className="w-6 h-6 bg-blue-200 rounded-full text-blue-800 text-xs flex items-center justify-center mr-3">1</span>
              Add teachers with their qualifications and availability
            </div>
            <div className="flex items-center">
              <span className="w-6 h-6 bg-blue-200 rounded-full text-blue-800 text-xs flex items-center justify-center mr-3">2</span>
              Create courses with their requirements and schedules
            </div>
            <div className="flex items-center">
              <span className="w-6 h-6 bg-blue-200 rounded-full text-blue-800 text-xs flex items-center justify-center mr-3">3</span>
              Generate AI-powered assignments
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
};

export default Dashboard;