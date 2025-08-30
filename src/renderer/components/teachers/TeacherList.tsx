import React, { useEffect, useState } from 'react';
import { Teacher } from '../../../shared/types';
import TeacherForm from './TeacherForm';

const TeacherList: React.FC = () => {
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingTeacher, setEditingTeacher] = useState<Teacher | null>(null);

  useEffect(() => {
    loadTeachers();
  }, []);

  const loadTeachers = async () => {
    try {
      setLoading(true);
      setError(null);
      const teacherData = await window.electronAPI.database.getAllTeachers();
      setTeachers(teacherData);
    } catch (err) {
      console.error('Failed to load teachers:', err);
      setError('Failed to load teachers');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteTeacher = async (teacherId: number, teacherName: string) => {
    if (!confirm(`Are you sure you want to delete teacher "${teacherName}"?`)) {
      return;
    }

    try {
      await window.electronAPI.database.deleteTeacher(teacherId);
      await loadTeachers(); // Reload the list
    } catch (err) {
      console.error('Failed to delete teacher:', err);
      setError('Failed to delete teacher');
    }
  };

  const handleEditTeacher = (teacher: Teacher) => {
    setEditingTeacher(teacher);
    setShowAddModal(true);
  };

  const handleAddTeacher = () => {
    setEditingTeacher(null);
    setShowAddModal(true);
  };

  const handleFormSave = async () => {
    setShowAddModal(false);
    setEditingTeacher(null);
    await loadTeachers(); // Refresh the list
  };

  const handleFormCancel = () => {
    setShowAddModal(false);
    setEditingTeacher(null);
  };

  const formatQualifications = (qualifications: string[]) => {
    if (!qualifications || qualifications.length === 0) {
      return 'No qualifications';
    }
    return qualifications.join(', ');
  };

  const formatWorkingTimes = (working_times: any) => {
    if (!working_times || Object.keys(working_times).length === 0) {
      return 'No availability set';
    }
    
    const days = Object.keys(working_times).filter(day => working_times[day]);
    if (days.length === 0) return 'No availability set';
    
    return `${days.length} day${days.length !== 1 ? 's' : ''} available`;
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
      <div className="bg-white rounded-lg shadow">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200">
          <div className="flex justify-between items-center">
            <h2 className="text-2xl font-bold text-gray-900">Teachers</h2>
            <button 
              onClick={handleAddTeacher}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center"
            >
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Add Teacher
            </button>
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div className="px-6 py-4 bg-red-50 border-l-4 border-red-400">
            <div className="flex">
              <svg className="w-5 h-5 text-red-400 mr-2" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
              <p className="text-red-700">{error}</p>
            </div>
          </div>
        )}

        {/* Teacher List */}
        <div className="p-6">
          {teachers.length === 0 ? (
            <div className="text-center py-12">
              <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                      d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
              </svg>
              <h3 className="mt-2 text-lg font-semibold text-gray-600">No Teachers Yet</h3>
              <p className="mt-1 text-gray-500 mb-4">
                Get started by adding your first teacher to the system.
              </p>
              <button 
                onClick={handleAddTeacher}
                className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
              >
                Add First Teacher
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {teachers.map((teacher) => (
                <div key={teacher.id} className="bg-gray-50 rounded-lg p-4 border border-gray-200 hover:shadow-md transition-shadow">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center">
                      <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center mr-3">
                        <span className="text-blue-600 font-semibold text-lg">
                          {teacher.name.charAt(0).toUpperCase()}
                        </span>
                      </div>
                      <div>
                        <h3 className="text-lg font-semibold text-gray-900">{teacher.name}</h3>
                        <p className="text-sm text-gray-500">Teacher ID: {teacher.id}</p>
                      </div>
                    </div>
                    <div className="flex space-x-1">
                      <button
                        onClick={() => handleEditTeacher(teacher)}
                        className="p-2 text-gray-400 hover:text-blue-600 transition-colors"
                        title="Edit Teacher"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                                d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                        </svg>
                      </button>
                      <button
                        onClick={() => handleDeleteTeacher(teacher.id, teacher.name)}
                        className="p-2 text-gray-400 hover:text-red-600 transition-colors"
                        title="Delete Teacher"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                                d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div>
                      <p className="text-sm font-medium text-gray-700">Qualifications</p>
                      <p className="text-sm text-gray-600">{formatQualifications(teacher.qualifications)}</p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-700">Availability</p>
                      <p className="text-sm text-gray-600">{formatWorkingTimes(teacher.working_times)}</p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-700">Added</p>
                      <p className="text-sm text-gray-600">
                        {new Date(teacher.created_at).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Add/Edit Teacher Form */}
      {showAddModal && (
        <TeacherForm
          teacher={editingTeacher}
          onSave={handleFormSave}
          onCancel={handleFormCancel}
        />
      )}
    </div>
  );
};

export default TeacherList;