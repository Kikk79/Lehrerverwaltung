import React, { useState, useEffect } from 'react';
import { Course } from '../../../shared/types';

interface CourseFormProps {
  course?: Course | null;
  onSave: () => void;
  onCancel: () => void;
}

const CourseForm: React.FC<CourseFormProps> = ({ course, onSave, onCancel }) => {
  const [formData, setFormData] = useState({
    topic: '',
    lessons_count: 1,
    lesson_duration: 60,
    start_date: '',
    end_date: ''
  });
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (course) {
      setFormData({
        topic: course.topic,
        lessons_count: course.lessons_count,
        lesson_duration: course.lesson_duration,
        start_date: course.start_date,
        end_date: course.end_date
      });
    }
  }, [course]);

  const handleInputChange = (field: string, value: string | number) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const validateForm = () => {
    if (!formData.topic.trim()) {
      setError('Course topic is required');
      return false;
    }
    
    if (formData.lessons_count < 1) {
      setError('Number of lessons must be at least 1');
      return false;
    }

    if (formData.lesson_duration < 1) {
      setError('Lesson duration must be at least 1 minute');
      return false;
    }

    if (!formData.start_date) {
      setError('Start date is required');
      return false;
    }

    if (!formData.end_date) {
      setError('End date is required');
      return false;
    }

    if (new Date(formData.end_date) <= new Date(formData.start_date)) {
      setError('End date must be after start date');
      return false;
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
      
      if (course) {
        // Update existing course
        await window.electronAPI.database.updateCourse(course.id, formData);
      } else {
        // Create new course
        await window.electronAPI.database.createCourse(formData);
      }
      
      onSave();
    } catch (err) {
      console.error('Failed to save course:', err);
      setError(`Failed to ${course ? 'update' : 'create'} course`);
    } finally {
      setLoading(false);
    }
  };

  const calculateTotalDuration = () => {
    const totalMinutes = formData.lessons_count * formData.lesson_duration;
    if (totalMinutes < 60) {
      return `${totalMinutes} minutes`;
    }
    const hours = Math.floor(totalMinutes / 60);
    const remainingMinutes = totalMinutes % 60;
    return remainingMinutes > 0 ? `${hours}h ${remainingMinutes}m` : `${hours} hours`;
  };

  const getMinEndDate = () => {
    if (!formData.start_date) return '';
    const startDate = new Date(formData.start_date);
    startDate.setDate(startDate.getDate() + 1);
    return startDate.toISOString().split('T')[0];
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-gray-900">
            {course ? 'Edit Course' : 'Add New Course'}
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
          {/* Course Topic */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Course Topic *
            </label>
            <input
              type="text"
              value={formData.topic}
              onChange={(e) => handleInputChange('topic', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="e.g., Mathematics, Physics, Chemistry"
              required
            />
            <p className="mt-1 text-xs text-gray-500">
              This should match exactly with teacher qualifications for assignment
            </p>
          </div>

          {/* Lesson Details */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Number of Lessons *
              </label>
              <input
                type="number"
                min="1"
                value={formData.lessons_count}
                onChange={(e) => handleInputChange('lessons_count', parseInt(e.target.value) || 1)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                required
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Lesson Duration (minutes) *
              </label>
              <select
                value={formData.lesson_duration}
                onChange={(e) => handleInputChange('lesson_duration', parseInt(e.target.value))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value={30}>30 minutes</option>
                <option value={45}>45 minutes</option>
                <option value={60}>60 minutes</option>
                <option value={90}>90 minutes</option>
                <option value={120}>120 minutes</option>
                <option value={180}>180 minutes</option>
              </select>
            </div>
          </div>

          {/* Total Duration Display */}
          {formData.lessons_count > 0 && formData.lesson_duration > 0 && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
              <div className="flex items-center">
                <svg className="w-5 h-5 text-blue-600 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                        d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <div>
                  <p className="text-sm font-medium text-blue-900">Total Course Duration</p>
                  <p className="text-sm text-blue-700">{calculateTotalDuration()}</p>
                </div>
              </div>
            </div>
          )}

          {/* Date Range */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Start Date *
              </label>
              <input
                type="date"
                value={formData.start_date}
                onChange={(e) => handleInputChange('start_date', e.target.value)}
                min={new Date().toISOString().split('T')[0]}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                required
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                End Date *
              </label>
              <input
                type="date"
                value={formData.end_date}
                onChange={(e) => handleInputChange('end_date', e.target.value)}
                min={getMinEndDate()}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                required
              />
            </div>
          </div>

          {/* Course Summary */}
          {formData.topic && formData.start_date && formData.end_date && (
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
              <h3 className="text-sm font-medium text-gray-900 mb-2">Course Summary</h3>
              <div className="text-sm text-gray-600 space-y-1">
                <p><strong>Topic:</strong> {formData.topic}</p>
                <p><strong>Schedule:</strong> {new Date(formData.start_date).toLocaleDateString()} - {new Date(formData.end_date).toLocaleDateString()}</p>
                <p><strong>Structure:</strong> {formData.lessons_count} lessons × {formData.lesson_duration} minutes = {calculateTotalDuration()}</p>
              </div>
            </div>
          )}

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
              {loading ? 'Saving...' : (course ? 'Update Course' : 'Create Course')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CourseForm;