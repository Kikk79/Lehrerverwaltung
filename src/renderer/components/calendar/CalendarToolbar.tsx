import React from 'react';
import { CalendarViewType, CalendarPreferences } from '../../../shared/services/CalendarService';

interface CalendarToolbarProps {
  currentView: CalendarViewType;
  onViewChange: (view: CalendarViewType) => void;
  onNavigate: (direction: 'prev' | 'next' | 'today') => void;
  onShowFilters: () => void;
  onRefresh: () => void;
  eventsCount: number;
  preferences: CalendarPreferences;
}

/**
 * Calendar Toolbar Component
 * Provides navigation controls, view switching, and calendar actions
 * German language support throughout
 */
const CalendarToolbar: React.FC<CalendarToolbarProps> = ({
  currentView,
  onViewChange,
  onNavigate,
  onShowFilters,
  onRefresh,
  eventsCount,
  preferences
}) => {
  const viewOptions: { value: CalendarViewType; label: string }[] = [
    { value: 'dayGridMonth', label: 'Monat' },
    { value: 'timeGridWeek', label: 'Woche' },
    { value: 'timeGridDay', label: 'Tag' },
    { value: 'listWeek', label: 'Agenda' }
  ];

  return (
    <div className="calendar-toolbar flex items-center justify-between p-4 bg-gray-50 border-b border-gray-200">
      {/* Left Section - Navigation */}
      <div className="flex items-center space-x-3">
        <button
          onClick={() => onNavigate('today')}
          className="px-3 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1 transition-colors"
        >
          Heute
        </button>
        
        <div className="flex items-center space-x-1">
          <button
            onClick={() => onNavigate('prev')}
            className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-md transition-colors"
            title="Vorherige Periode"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          
          <button
            onClick={() => onNavigate('next')}
            className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-md transition-colors"
            title="Nächste Periode"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </div>
      </div>

      {/* Center Section - View Selector */}
      <div className="flex items-center space-x-2">
        <span className="text-sm text-gray-600 font-medium">Ansicht:</span>
        <div className="flex bg-white border border-gray-300 rounded-md overflow-hidden">
          {viewOptions.map((option) => (
            <button
              key={option.value}
              onClick={() => onViewChange(option.value)}
              className={`px-4 py-2 text-sm font-medium transition-colors ${
                currentView === option.value
                  ? 'bg-blue-600 text-white'
                  : 'text-gray-700 hover:bg-gray-50'
              }`}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>

      {/* Right Section - Actions and Stats */}
      <div className="flex items-center space-x-3">
        {/* Events Counter */}
        <div className="flex items-center space-x-2 text-sm text-gray-600">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
          <span>
            {eventsCount} {eventsCount === 1 ? 'Termin' : 'Termine'}
          </span>
        </div>

        {/* Filter Button */}
        <button
          onClick={onShowFilters}
          className="flex items-center space-x-2 px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1 transition-colors"
          title="Filter anzeigen/ausblenden"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.121A1 1 0 013 6.414V4z" />
          </svg>
          <span>Filter</span>
        </button>

        {/* Refresh Button */}
        <button
          onClick={onRefresh}
          className="flex items-center space-x-2 px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1 transition-colors"
          title="Kalender aktualisieren"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          <span>Aktualisieren</span>
        </button>
      </div>
    </div>
  );
};

export default CalendarToolbar;