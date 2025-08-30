import React, { useState, useEffect } from 'react';
import { Teacher, Course, FilterOptions, AssignmentStatus } from '../../../shared/types';

interface CalendarFiltersProps {
  teachers: Teacher[];
  courses: Course[];
  filterOptions: FilterOptions;
  onFilterChange: (filters: FilterOptions) => void;
  onClose: () => void;
}

/**
 * Calendar Filters Component
 * Provides filtering controls for calendar events by teacher, course, date range, and status
 * German language support throughout
 */
const CalendarFilters: React.FC<CalendarFiltersProps> = ({
  teachers,
  courses,
  filterOptions,
  onFilterChange,
  onClose
}) => {
  const [localFilters, setLocalFilters] = useState<FilterOptions>(filterOptions);
  const [dateRangeEnabled, setDateRangeEnabled] = useState<boolean>(
    !!filterOptions.date_range
  );

  // Update local filters when external filters change
  useEffect(() => {
    setLocalFilters(filterOptions);
    setDateRangeEnabled(!!filterOptions.date_range);
  }, [filterOptions]);

  const handleTeacherToggle = (teacherId: number) => {
    const currentTeachers = localFilters.teachers || [];
    const newTeachers = currentTeachers.includes(teacherId)
      ? currentTeachers.filter(id => id !== teacherId)
      : [...currentTeachers, teacherId];
    
    setLocalFilters({
      ...localFilters,
      teachers: newTeachers.length > 0 ? newTeachers : undefined
    });
  };

  const handleCourseToggle = (courseId: number) => {
    const currentCourses = localFilters.courses || [];
    const newCourses = currentCourses.includes(courseId)
      ? currentCourses.filter(id => id !== courseId)
      : [...currentCourses, courseId];
    
    setLocalFilters({
      ...localFilters,
      courses: newCourses.length > 0 ? newCourses : undefined
    });
  };

  const handleStatusToggle = (status: AssignmentStatus) => {
    const currentStatuses = localFilters.status || [];
    const newStatuses = currentStatuses.includes(status)
      ? currentStatuses.filter(s => s !== status)
      : [...currentStatuses, status];
    
    setLocalFilters({
      ...localFilters,
      status: newStatuses.length > 0 ? newStatuses : undefined
    });
  };

  const handleDateRangeChange = (field: 'start' | 'end', value: string) => {
    if (!dateRangeEnabled) return;
    
    const currentRange = localFilters.date_range || { start: '', end: '' };
    const newRange = { ...currentRange, [field]: value };
    
    setLocalFilters({
      ...localFilters,
      date_range: newRange
    });
  };

  const handleDateRangeToggle = () => {
    const enabled = !dateRangeEnabled;
    setDateRangeEnabled(enabled);
    
    if (!enabled) {
      setLocalFilters({
        ...localFilters,
        date_range: undefined
      });
    } else {
      // Set default date range (current month)
      const now = new Date();
      const start = new Date(now.getFullYear(), now.getMonth(), 1);
      const end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
      
      setLocalFilters({
        ...localFilters,
        date_range: {
          start: start.toISOString().split('T')[0],
          end: end.toISOString().split('T')[0]
        }
      });
    }
  };

  const handleApplyFilters = () => {
    onFilterChange(localFilters);
  };

  const handleClearFilters = () => {
    const emptyFilters: FilterOptions = {};
    setLocalFilters(emptyFilters);
    setDateRangeEnabled(false);
    onFilterChange(emptyFilters);
  };

  const statusOptions: { value: AssignmentStatus; label: string }[] = [
    { value: 'active', label: 'Aktiv' },
    { value: 'pending', label: 'Ausstehend' },
    { value: 'completed', label: 'Abgeschlossen' },
    { value: 'cancelled', label: 'Abgebrochen' }
  ];

  const getActiveFiltersCount = () => {
    let count = 0;
    if (localFilters.teachers && localFilters.teachers.length > 0) count++;
    if (localFilters.courses && localFilters.courses.length > 0) count++;
    if (localFilters.status && localFilters.status.length > 0) count++;
    if (localFilters.date_range) count++;
    return count;
  };

  return (
    <div className="calendar-filters bg-gray-50 border-b border-gray-200">
      <div className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900">Filter</h3>
          <div className="flex items-center space-x-2">
            {getActiveFiltersCount() > 0 && (
              <span className="px-2 py-1 text-xs font-medium bg-blue-100 text-blue-800 rounded-full">
                {getActiveFiltersCount()} aktiv
              </span>
            )}
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {/* Teacher Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Lehrer ({localFilters.teachers?.length || 0} ausgewählt)
            </label>
            <div className="max-h-40 overflow-y-auto border border-gray-300 rounded-md bg-white">
              {teachers.map((teacher) => (
                <label
                  key={teacher.id}
                  className="flex items-center p-3 hover:bg-gray-50 cursor-pointer border-b border-gray-100 last:border-b-0"
                >
                  <input
                    type="checkbox"
                    checked={localFilters.teachers?.includes(teacher.id) || false}
                    onChange={() => handleTeacherToggle(teacher.id)}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                  <span className="ml-2 text-sm text-gray-900">{teacher.name}</span>
                </label>
              ))}
              {teachers.length === 0 && (
                <div className="p-3 text-sm text-gray-500 text-center">
                  Keine Lehrer verfügbar
                </div>
              )}
            </div>
          </div>

          {/* Course Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Kurse ({localFilters.courses?.length || 0} ausgewählt)
            </label>
            <div className="max-h-40 overflow-y-auto border border-gray-300 rounded-md bg-white">
              {courses.map((course) => (
                <label
                  key={course.id}
                  className="flex items-center p-3 hover:bg-gray-50 cursor-pointer border-b border-gray-100 last:border-b-0"
                >
                  <input
                    type="checkbox"
                    checked={localFilters.courses?.includes(course.id) || false}
                    onChange={() => handleCourseToggle(course.id)}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                  <span className="ml-2 text-sm text-gray-900">{course.topic}</span>
                </label>
              ))}
              {courses.length === 0 && (
                <div className="p-3 text-sm text-gray-500 text-center">
                  Keine Kurse verfügbar
                </div>
              )}
            </div>
          </div>

          {/* Status Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Status ({localFilters.status?.length || 0} ausgewählt)
            </label>
            <div className="space-y-2">
              {statusOptions.map((option) => (
                <label
                  key={option.value}
                  className="flex items-center p-2 hover:bg-gray-50 cursor-pointer rounded-md"
                >
                  <input
                    type="checkbox"
                    checked={localFilters.status?.includes(option.value) || false}
                    onChange={() => handleStatusToggle(option.value)}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                  <span className="ml-2 text-sm text-gray-900">{option.label}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Date Range Filter */}
          <div>
            <label className="flex items-center text-sm font-medium text-gray-700 mb-2">
              <input
                type="checkbox"
                checked={dateRangeEnabled}
                onChange={handleDateRangeToggle}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded mr-2"
              />
              Datumsbereich
            </label>
            <div className="space-y-2">
              <div>
                <label className="block text-xs text-gray-600 mb-1">Von:</label>
                <input
                  type="date"
                  value={localFilters.date_range?.start || ''}
                  onChange={(e) => handleDateRangeChange('start', e.target.value)}
                  disabled={!dateRangeEnabled}
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100 disabled:text-gray-400"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-600 mb-1">Bis:</label>
                <input
                  type="date"
                  value={localFilters.date_range?.end || ''}
                  onChange={(e) => handleDateRangeChange('end', e.target.value)}
                  disabled={!dateRangeEnabled}
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100 disabled:text-gray-400"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-between mt-6 pt-4 border-t border-gray-200">
          <button
            onClick={handleClearFilters}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1 transition-colors"
          >
            Alle zurücksetzen
          </button>
          <button
            onClick={handleApplyFilters}
            className="px-6 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1 transition-colors"
          >
            Filter anwenden
          </button>
        </div>
      </div>
    </div>
  );
};

export default CalendarFilters;