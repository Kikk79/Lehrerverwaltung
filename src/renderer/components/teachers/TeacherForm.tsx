import React, { useState, useEffect } from 'react';
import { Teacher, WorkingTimes, TimeRange } from '../../../shared/types';

interface TeacherFormProps {
  teacher?: Teacher | null;
  onSave: () => void;
  onCancel: () => void;
}

const TeacherForm: React.FC<TeacherFormProps> = ({ teacher, onSave, onCancel }) => {
  const [formData, setFormData] = useState({
    name: '',
    qualifications: [] as string[],
    working_times: {} as WorkingTimes
  });
  
  const [qualificationInput, setQualificationInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
  const dayLabels: { [key: string]: string } = {
    monday: 'Monday',
    tuesday: 'Tuesday',
    wednesday: 'Wednesday',
    thursday: 'Thursday',
    friday: 'Friday',
    saturday: 'Saturday',
    sunday: 'Sunday'
  };

  useEffect(() => {
    if (teacher) {
      setFormData({
        name: teacher.name,
        qualifications: [...teacher.qualifications],
        working_times: { ...teacher.working_times }
      });
    }
  }, [teacher]);

  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData(prev => ({ ...prev, name: e.target.value }));
  };

  const handleAddQualification = () => {
    const qualification = qualificationInput.trim();
    if (qualification && !formData.qualifications.includes(qualification)) {
      setFormData(prev => ({
        ...prev,
        qualifications: [...prev.qualifications, qualification]
      }));
      setQualificationInput('');
    }
  };

  const handleRemoveQualification = (index: number) => {
    setFormData(prev => ({
      ...prev,
      qualifications: prev.qualifications.filter((_, i) => i !== index)
    }));
  };

  const handleWorkingTimeChange = (day: string, field: 'start' | 'end', value: string) => {
    setFormData(prev => ({
      ...prev,
      working_times: {
        ...prev.working_times,
        [day]: {
          ...prev.working_times[day as keyof WorkingTimes],
          [field]: value
        }
      }
    }));
  };

  const handleWorkingDayToggle = (day: string) => {
    setFormData(prev => ({
      ...prev,
      working_times: {
        ...prev.working_times,
        [day]: prev.working_times[day as keyof WorkingTimes] 
          ? undefined 
          : { start: '09:00', end: '17:00' }
      }
    }));
  };

  const validateForm = () => {
    if (!formData.name.trim()) {
      setError('Teacher name is required');
      return false;
    }
    
    if (formData.qualifications.length === 0) {
      setError('At least one qualification is required');
      return false;
    }

    // Validate working times
    for (const [day, times] of Object.entries(formData.working_times)) {
      if (times && (!times.start || !times.end)) {
        setError(`Please set both start and end times for ${dayLabels[day]}`);
        return false;
      }
      if (times && times.start >= times.end) {
        setError(`End time must be after start time for ${dayLabels[day]}`);
        return false;
      }
    }

    return true;
  };

  const handleSave = async () => {
    setError(null);
    
    if (!validateForm()) {
      return;
    }

    try {
      setLoading(true);
      
      if (teacher) {
        // Update existing teacher
        await window.electronAPI.database.updateTeacher(teacher.id, formData);
      } else {
        // Create new teacher
        await window.electronAPI.database.createTeacher(formData);
      }
      
      onSave();
    } catch (err) {
      console.error('Failed to save teacher:', err);
      setError(`Failed to ${teacher ? 'update' : 'create'} teacher`);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && qualificationInput.trim()) {
      e.preventDefault();
      handleAddQualification();
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-gray-900">
            {teacher ? 'Edit Teacher' : 'Add New Teacher'}
          </h2>
          <button
            onClick={onCancel}
            className="text-gray-400 hover:text-gray-600"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded">
            {error}
          </div>
        )}

        <form className="space-y-6">
          {/* Name Field */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Teacher Name *
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={handleNameChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="Enter teacher name"
              required
            />
          </div>

          {/* Qualifications */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Qualifications *
            </label>
            <div className="space-y-2">
              <div className="flex gap-2">
                <input
                  type="text"
                  value={qualificationInput}
                  onChange={(e) => setQualificationInput(e.target.value)}
                  onKeyPress={handleKeyPress}
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Add a qualification (e.g., Mathematics, Physics)"
                />
                <button
                  type="button"
                  onClick={handleAddQualification}
                  disabled={!qualificationInput.trim()}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
                >
                  Add
                </button>
              </div>
              
              {formData.qualifications.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {formData.qualifications.map((qualification, index) => (
                    <span
                      key={index}
                      className="inline-flex items-center px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm"
                    >
                      {qualification}
                      <button
                        type="button"
                        onClick={() => handleRemoveQualification(index)}
                        className="ml-2 text-blue-600 hover:text-blue-800"
                      >
                        ×
                      </button>
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Working Times */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">
              Working Schedule
            </label>
            <div className="space-y-3">
              {days.map((day) => {
                const isActive = !!formData.working_times[day as keyof WorkingTimes];
                const times = formData.working_times[day as keyof WorkingTimes];
                
                return (
                  <div key={day} className="flex items-center gap-4 p-3 border border-gray-200 rounded-lg">
                    <div className="flex items-center">
                      <input
                        type="checkbox"
                        id={day}
                        checked={isActive}
                        onChange={() => handleWorkingDayToggle(day)}
                        className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                      />
                      <label htmlFor={day} className="ml-2 text-sm font-medium text-gray-700 w-20">
                        {dayLabels[day]}
                      </label>
                    </div>
                    
                    {isActive && (
                      <div className="flex items-center gap-2">
                        <input
                          type="time"
                          value={times?.start || '09:00'}
                          onChange={(e) => handleWorkingTimeChange(day, 'start', e.target.value)}
                          className="px-2 py-1 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        />
                        <span className="text-gray-500">to</span>
                        <input
                          type="time"
                          value={times?.end || '17:00'}
                          onChange={(e) => handleWorkingTimeChange(day, 'end', e.target.value)}
                          className="px-2 py-1 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Form Actions */}
          <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
            <button
              type="button"
              onClick={onCancel}
              className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={loading}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-blue-400 disabled:cursor-not-allowed flex items-center"
            >
              {loading && (
                <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
              )}
              {loading ? 'Saving...' : (teacher ? 'Update Teacher' : 'Create Teacher')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default TeacherForm;