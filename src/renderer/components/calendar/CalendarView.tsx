import React, { useState, useEffect, useCallback, useRef } from 'react';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import interactionPlugin from '@fullcalendar/interaction';
import listPlugin from '@fullcalendar/list';
import { 
  CalendarEvent, 
  FilterOptions, 
  Assignment,
  Teacher,
  Course 
} from '../../../shared/types';
import { CalendarService, CalendarViewType, CalendarPreferences } from '../../../shared/services/CalendarService';
import CalendarToolbar from './CalendarToolbar';
import CalendarFilters from './CalendarFilters';
import EventDetailsModal from './EventDetailsModal';
import { EventClickArg, EventDropArg } from '@fullcalendar/core';

interface CalendarViewProps {
  className?: string;
}

/**
 * Main Calendar View Component
 * Implements FullCalendar with Outlook-like styling and functionality
 * Features: Multiple view modes, drag-drop, filtering, event details
 */
const CalendarView: React.FC<CalendarViewProps> = ({ className = '' }) => {
  // Services
  const calendarService = new CalendarService();
  // Use IPC-backed database API exposed by preload instead of importing better-sqlite3 into the renderer
  const electronAPI = (window as any).electronAPI;
  
  // Calendar state
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [filteredEvents, setFilteredEvents] = useState<CalendarEvent[]>([]);
  const [currentView, setCurrentView] = useState<CalendarViewType>('timeGridWeek');
  const [preferences, setPreferences] = useState<CalendarPreferences>(
    calendarService.getDefaultPreferences()
  );
  
  // UI state
  const [loading, setLoading] = useState(true);
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);
  const [showEventModal, setShowEventModal] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [filterOptions, setFilterOptions] = useState<FilterOptions>({});
  const [error, setError] = useState<string | null>(null);
  
  // Data for filtering
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  
  // Calendar ref for direct API access
  const calendarRef = useRef<FullCalendar>(null);

  /**
   * Load all calendar data on component mount
   */
  useEffect(() => {
    // Load preferences from DB via IPC
    (async () => {
      const prefs = await calendarService.getCalendarPreferencesAsync();
      setPreferences(prefs);
    })();
    loadCalendarData();
  }, []);

  /**
   * Apply filters when filter options change
   */
  useEffect(() => {
    const filtered = calendarService.filterCalendarEvents(events, filterOptions);
    setFilteredEvents(filtered);
  }, [events, filterOptions, calendarService]);

  /**
   * Load calendar data from database
   */
  const loadCalendarData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      // Load base data via IPC (renderer -> main)
      const allTeachers: Teacher[] = await electronAPI.database.getAllTeachers();
      const allCourses: Course[] = await electronAPI.database.getAllCourses();
      const allAssignments: Assignment[] = await electronAPI.database.getAllAssignments();
      const activeAssignments = allAssignments.filter(a => a.status === 'active');

      setTeachers(allTeachers);
      setCourses(allCourses);

      // Convert assignments to calendar events
      const calendarEvents = calendarService.convertAssignmentsToCalendarEvents(
        activeAssignments,
        allTeachers,
        allCourses
      );

      setEvents(calendarEvents);

    } catch (error) {
      console.error('Error loading calendar data:', error);
      setError(`German: Fehler beim Laden der Kalenderdaten: ${error instanceof Error ? error.message : 'Unbekannter Fehler'}`);
    } finally {
      setLoading(false);
    }
  }, [calendarService, electronAPI]);

  /**
   * Handle calendar view change
   */
  const handleViewChange = useCallback(async (newView: CalendarViewType) => {
    setCurrentView(newView);
    
    // Update calendar view
    const calendarApi = calendarRef.current?.getApi();
    if (calendarApi) {
      calendarApi.changeView(newView);
    }

    // Save preference
    const updatedPrefs = { ...preferences, defaultView: newView };
    setPreferences(updatedPrefs);
    await calendarService.saveCalendarPreferences(updatedPrefs);
  }, [preferences, calendarService]);

  /**
   * Handle event click - show details modal
   */
  const handleEventClick = useCallback((info: EventClickArg) => {
    const eventId = info.event.id;
    const event = filteredEvents.find(e => e.id === eventId);
    
    if (event) {
      setSelectedEvent(event);
      setShowEventModal(true);
    }
  }, [filteredEvents]);

  /**
   * Handle event drag and drop
   */
  const handleEventDrop = useCallback(async (info: EventDropArg) => {
    try {
      const eventId = info.event.id;
      const newStart = info.event.start!;
      const newEnd = info.event.end || new Date(newStart.getTime() + 60 * 60 * 1000); // Default 1 hour if no end

      const result = await calendarService.handleEventDrop(eventId, newStart, newEnd);

      if (!result.success) {
        // Revert the move
        info.revert();
        setError(result.message || 'German: Fehler beim Verschieben des Ereignisses');
        return;
      }

      // Show success message or warnings
      if (result.conflicts && result.conflicts.length > 0) {
        const warningCount = result.conflicts.filter(c => c.severity !== 'critical').length;
        if (warningCount > 0) {
          console.warn(`Event moved with ${warningCount} warnings`, result.conflicts);
        }
      }

      // Refresh calendar data
      await loadCalendarData();

    } catch (error) {
      console.error('Error handling event drop:', error);
      info.revert();
      setError(`German: Fehler beim Verschieben: ${error instanceof Error ? error.message : 'Unbekannter Fehler'}`);
    }
  }, [calendarService, loadCalendarData]);

  /**
   * Handle event resize (duration change)
   */
  const handleEventResize = useCallback(async (info: any) => {
    try {
      const eventId = info.event.id;
      const newStart = info.event.start!;
      const newEnd = info.event.end!;

      const result = await calendarService.handleEventDrop(eventId, newStart, newEnd);

      if (!result.success) {
        // Revert the resize
        info.revert();
        setError(result.message || 'German: Fehler beim Ändern der Ereignisdauer');
        return;
      }

      // Refresh calendar data
      await loadCalendarData();

    } catch (error) {
      console.error('Error handling event resize:', error);
      info.revert();
      setError(`German: Fehler beim Ändern der Dauer: ${error instanceof Error ? error.message : 'Unbekannter Fehler'}`);
    }
  }, [calendarService, loadCalendarData]);

  /**
   * Handle date navigation
   */
  const handleNavigate = useCallback((direction: 'prev' | 'next' | 'today') => {
    const calendarApi = calendarRef.current?.getApi();
    if (!calendarApi) return;

    switch (direction) {
      case 'prev':
        calendarApi.prev();
        break;
      case 'next':
        calendarApi.next();
        break;
      case 'today':
        calendarApi.today();
        break;
    }
  }, []);

  /**
   * Handle filter changes
   */
  const handleFilterChange = useCallback((newFilters: FilterOptions) => {
    setFilterOptions(newFilters);
  }, []);

  /**
   * Close event details modal
   */
  const closeEventModal = useCallback(() => {
    setShowEventModal(false);
    setSelectedEvent(null);
  }, []);

  /**
   * Refresh calendar after external changes
   */
  const refreshCalendar = useCallback(() => {
    loadCalendarData();
  }, [loadCalendarData]);

  /**
   * Clear error message
   */
  const clearError = useCallback(() => {
    setError(null);
  }, []);

  if (loading) {
    return (
      <div className={`flex items-center justify-center h-96 ${className}`}>
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">German: Kalenderdaten werden geladen...</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`calendar-view bg-white rounded-lg shadow-sm ${className}`}>
      {/* Calendar Toolbar */}
      <CalendarToolbar
        currentView={currentView}
        onViewChange={handleViewChange}
        onNavigate={handleNavigate}
        onShowFilters={() => setShowFilters(!showFilters)}
        onRefresh={refreshCalendar}
        eventsCount={filteredEvents.length}
        preferences={preferences}
      />

      {/* Error Message */}
      {error && (
        <div className="mx-6 mb-4 p-4 bg-red-50 border border-red-200 rounded-md">
          <div className="flex justify-between items-start">
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
            <button
              onClick={clearError}
              className="text-red-400 hover:text-red-600"
            >
              <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
              </svg>
            </button>
          </div>
        </div>
      )}

      {/* Calendar Filters */}
      {showFilters && (
        <div className="border-b border-gray-200">
          <CalendarFilters
            teachers={teachers}
            courses={courses}
            filterOptions={filterOptions}
            onFilterChange={handleFilterChange}
            onClose={() => setShowFilters(false)}
          />
        </div>
      )}

      {/* Main Calendar */}
      <div className="p-6">
        <div className="calendar-container" style={{ minHeight: '600px' }}>
          <FullCalendar
            ref={calendarRef}
            plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin, listPlugin]}
            
            // Initial view and date
            initialView={currentView}
            
            // Events
            events={filteredEvents.map(event => ({
              id: event.id,
              title: event.title,
              start: event.start,
              end: event.end,
              backgroundColor: event.backgroundColor,
              borderColor: event.borderColor,
              textColor: preferences.theme.textColor
            }))}
            
            // Event handlers
            eventClick={handleEventClick}
            eventDrop={handleEventDrop}
            eventResize={handleEventResize}
            
            // Drag and drop
            editable={true}
            droppable={false}
            
            // Header and navigation
            headerToolbar={false} // We use custom toolbar
            
            // Time settings
            slotDuration={preferences.slotDuration}
            slotMinTime="06:00:00"
            slotMaxTime="22:00:00"
            
            // Localization
            locale={preferences.locale}
            firstDay={preferences.weekStart}
            
            // View settings
            weekends={preferences.showWeekends}
            dayMaxEvents={3}
            moreLinkClick="popover"
            
            // Styling
            height="auto"
            contentHeight="auto"
            aspectRatio={1.35}
            
            // Custom CSS classes
            eventClassNames="calendar-event"
            dayHeaderClassNames="calendar-day-header"
            
            // Additional options for professional appearance
            nowIndicator={true}
            scrollTime="08:00:00"
            slotLabelFormat={{
              hour: '2-digit',
              minute: '2-digit',
              hour12: false
            }}
            eventTimeFormat={{
              hour: '2-digit',
              minute: '2-digit',
              hour12: false
            }}
            
            // Business hours (optional - can be configured)
            businessHours={{
              startTime: '08:00',
              endTime: '18:00',
              daysOfWeek: [1, 2, 3, 4, 5] // Monday - Friday
            }}
          />
        </div>
      </div>

      {/* Event Details Modal */}
      {showEventModal && selectedEvent && (
        <EventDetailsModal
          event={selectedEvent}
          onClose={closeEventModal}
          onRefresh={refreshCalendar}
        />
      )}
    </div>
  );
};

export default CalendarView;