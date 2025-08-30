import React, { useState } from 'react';
import NavigationBar from './NavigationBar';
import Dashboard from '../common/Dashboard';
import TeacherList from '../teachers/TeacherList';
import CourseList from '../courses/CourseList';
import AssignmentList from '../assignments/AssignmentList';
import CalendarView from '../calendar/CalendarView';
import SettingsPanel from '../settings/SettingsPanel';

export type ViewType = 'dashboard' | 'teachers' | 'courses' | 'assignments' | 'calendar' | 'settings';

interface MainWindowProps {
  className?: string;
}

const MainWindow: React.FC<MainWindowProps> = ({ className = '' }) => {
  const [activeView, setActiveView] = useState<ViewType>('dashboard');

  const renderActiveView = () => {
    switch (activeView) {
      case 'dashboard':
        return <Dashboard />;
      case 'teachers':
        return <TeacherList />;
      case 'courses':
        return <CourseList />;
      case 'assignments':
        return <AssignmentList />;
      case 'calendar':
        return <CalendarView />;
      case 'settings':
        return <SettingsPanel />;
      default:
        return <Dashboard />;
    }
  };

  return (
    <div className={`flex h-screen bg-gray-50 ${className}`}>
      {/* Sidebar Navigation */}
      <NavigationBar 
        activeView={activeView}
        onViewChange={setActiveView}
      />
      
      {/* Main Content Area */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <header className="bg-white shadow-sm border-b border-gray-200">
          <div className="px-6 py-4">
            <div className="flex justify-between items-center">
              <h1 className="text-2xl font-bold text-gray-900">
                Teacher Course Assignment
              </h1>
              <div className="text-sm text-gray-500">
                AI-Powered Course Assignment System
              </div>
            </div>
          </div>
        </header>
        
        {/* Content */}
        <main className="flex-1 overflow-auto">
          <div className="p-6">
            {renderActiveView()}
          </div>
        </main>
      </div>
    </div>
  );
};

export default MainWindow;