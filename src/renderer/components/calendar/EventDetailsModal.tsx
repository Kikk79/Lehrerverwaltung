import React, { useState, useEffect } from 'react';
import { CalendarEvent } from '../../../shared/types';
import { DatabaseService } from '../../../shared/services/DatabaseService';
import { CalendarService } from '../../../shared/services/CalendarService';

interface EventDetailsModalProps {
  event: CalendarEvent;
  onClose: () => void;
  onRefresh: () => void;
}

/**
 * Event Details Modal Component
 * Displays detailed information about a calendar event/assignment
 * German language support throughout
 */
const EventDetailsModal: React.FC<EventDetailsModalProps> = ({
  event,
  onClose,
  onRefresh
}) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const dbService = DatabaseService.getInstance();
  const calendarService = new CalendarService();

  // Fetch detailed data
  const teacher = dbService.getTeacher(event.teacherId);
  const course = dbService.getCourse(event.courseId);
  const assignment = dbService.getAssignment(event.assignmentId);

  useEffect(() => {
    // Close modal on Escape key
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  const handleDeleteEvent = async () => {
    if (!assignment || !window.confirm('Möchten Sie diese Zuweisung wirklich löschen?')) {
      return;
    }

    try {
      setLoading(true);
      setError(null);

      // Remove the specific time slot from the assignment
      const updatedSlots = assignment.scheduled_slots.filter(slot => {
        const slotDateTime = `${slot.date}-${slot.start_time}`;
        const eventDateTime = `${event.start.toISOString().split('T')[0]}-${formatTime(event.start)}`;
        return slotDateTime !== eventDateTime;
      });

      if (updatedSlots.length === 0) {
        // If no slots remain, delete the entire assignment
        dbService.deleteAssignment(assignment.id);
      } else {
        // Update assignment with remaining slots
        dbService.updateAssignment(assignment.id, {
          scheduled_slots: updatedSlots,
          ai_rationale: `${assignment.ai_rationale || ''} [Calendar: Slot removed ${formatTime(event.start)} on ${event.start.toISOString().split('T')[0]}]`
        });
      }

      onRefresh();
      onClose();
    } catch (error) {
      console.error('Error deleting event:', error);
      setError(`Fehler beim Löschen: ${error instanceof Error ? error.message : 'Unbekannter Fehler'}`);
    } finally {
      setLoading(false);
    }
  };

  const formatTime = (date: Date): string => {
    return date.toLocaleTimeString('de-DE', { 
      hour: '2-digit', 
      minute: '2-digit',
      hour12: false 
    });
  };

  const formatDate = (date: Date): string => {
    return date.toLocaleDateString('de-DE', { 
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const calculateDuration = (): number => {
    return Math.round((event.end.getTime() - event.start.getTime()) / (1000 * 60));
  };

  if (!teacher || !course || !assignment) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
        <div className="bg-white rounded-lg max-w-md w-full p-6">
          <div className="text-center">
            <div className="text-red-600 mb-4">
              <svg className="mx-auto h-12 w-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.5 0L4.268 15.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Ereignisdetails nicht verfügbar</h3>
            <p className="text-gray-600 mb-4">Die Details für dieses Ereignis konnten nicht geladen werden.</p>
            <button
              onClick={onClose}
              className="px-4 py-2 bg-gray-600 text-white text-sm font-medium rounded-md hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2"
            >
              Schließen
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center space-x-3">
            <div
              className="w-4 h-4 rounded"
              style={{ backgroundColor: event.backgroundColor }}
            ></div>
            <h2 className="text-xl font-semibold text-gray-900">Termindetails</h2>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 focus:outline-none"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          {/* Error Message */}
          {error && (
            <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-md">
              <div className="flex">
                <div className="flex-shrink-0">
                  <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="ml-3">
                  <p className="text-sm text-red-800">{error}</p>
                </div>
              </div>
            </div>
          )}

          {/* Event Information */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            {/* Basic Information */}
            <div className="space-y-4">
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-3">Allgemeine Informationen</h3>
                <div className="space-y-2">
                  <div className="flex items-start">
                    <span className="text-sm text-gray-600 w-20 flex-shrink-0">Kurs:</span>
                    <span className="text-sm font-medium text-gray-900">{course.topic}</span>
                  </div>
                  <div className="flex items-start">
                    <span className="text-sm text-gray-600 w-20 flex-shrink-0">Lehrer:</span>
                    <span className="text-sm font-medium text-gray-900">{teacher.name}</span>
                  </div>
                  <div className="flex items-start">
                    <span className="text-sm text-gray-600 w-20 flex-shrink-0">Status:</span>
                    <span className={`text-sm font-medium px-2 py-1 rounded-full ${
                      assignment.status === 'active' ? 'bg-green-100 text-green-800' :
                      assignment.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                      assignment.status === 'completed' ? 'bg-blue-100 text-blue-800' :
                      'bg-red-100 text-red-800'
                    }`}>
                      {calendarService['translateStatus'](assignment.status)}
                    </span>
                  </div>
                </div>
              </div>

              {/* Teacher Qualifications */}
              <div>
                <h4 className="text-sm font-semibold text-gray-900 mb-2">Lehrerqualifikationen:</h4>
                <div className="flex flex-wrap gap-2">
                  {teacher.qualifications.map((qual: string, index: number) => (
                    <span
                      key={index}
                      className="px-2 py-1 text-xs font-medium bg-blue-100 text-blue-800 rounded-md"
                    >
                      {qual}
                    </span>
                  ))}
                </div>
              </div>
            </div>

            {/* Time and Duration */}
            <div className="space-y-4">
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-3">Zeit und Dauer</h3>
                <div className="space-y-2">
                  <div className="flex items-start">
                    <span className="text-sm text-gray-600 w-20 flex-shrink-0">Datum:</span>
                    <span className="text-sm font-medium text-gray-900">{formatDate(event.start)}</span>
                  </div>
                  <div className="flex items-start">
                    <span className="text-sm text-gray-600 w-20 flex-shrink-0">Zeit:</span>
                    <span className="text-sm font-medium text-gray-900">
                      {formatTime(event.start)} - {formatTime(event.end)}
                    </span>
                  </div>
                  <div className="flex items-start">
                    <span className="text-sm text-gray-600 w-20 flex-shrink-0">Dauer:</span>
                    <span className="text-sm font-medium text-gray-900">{calculateDuration()} Minuten</span>
                  </div>
                </div>
              </div>

              {/* Course Information */}
              <div>
                <h4 className="text-sm font-semibold text-gray-900 mb-2">Kursinformationen:</h4>
                <div className="space-y-1 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Gesamtstunden:</span>
                    <span className="font-medium">{course.lessons_count}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Stundenlänge:</span>
                    <span className="font-medium">{course.lesson_duration} min</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Kursdauer:</span>
                    <span className="font-medium">{course.start_date} - {course.end_date}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* AI Rationale */}
          {assignment.ai_rationale && (
            <div className="mb-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-3">KI-Begründung</h3>
              <div className="bg-gray-50 rounded-md p-4">
                <p className="text-sm text-gray-700 leading-relaxed">
                  {assignment.ai_rationale}
                </p>
              </div>
            </div>
          )}

          {/* Assignment Overview */}
          <div className="mb-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-3">Zuweisungsübersicht</h3>
            <div className="bg-gray-50 rounded-md p-4">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
                <div>
                  <div className="text-2xl font-bold text-blue-600">{assignment.scheduled_slots.length}</div>
                  <div className="text-sm text-gray-600">Termine gesamt</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-green-600">
                    {Math.round(assignment.scheduled_slots.reduce((total: number, slot: any) => total + slot.duration_minutes, 0) / 60)}
                  </div>
                  <div className="text-sm text-gray-600">Stunden gesamt</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-purple-600">
                    {new Set(assignment.scheduled_slots.map((slot: any) => slot.date)).size}
                  </div>
                  <div className="text-sm text-gray-600">Tage</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-orange-600">
                    {Math.round(assignment.scheduled_slots.reduce((total: number, slot: any) => total + slot.duration_minutes, 0) / assignment.scheduled_slots.length)}
                  </div>
                  <div className="text-sm text-gray-600">Ø Minuten</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-6 bg-gray-50 border-t border-gray-200">
          <div className="text-sm text-gray-500">
            Erstellt: {new Date(assignment.created_at).toLocaleDateString('de-DE')}
          </div>
          <div className="flex items-center space-x-3">
            <button
              onClick={handleDeleteEvent}
              disabled={loading}
              className="px-4 py-2 text-sm font-medium text-red-700 bg-red-100 hover:bg-red-200 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {loading ? 'Wird gelöscht...' : 'Termin löschen'}
            </button>
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors"
            >
              Schließen
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EventDetailsModal;