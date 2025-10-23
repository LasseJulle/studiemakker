import * as React from 'react';
import { useState } from 'react';
import { DashboardView, User } from '../../types';
import Sidebar from '../Sidebar';
import NotesSection from '../sections/NotesSection';
import AIChatSection from '../sections/AIChatSection';
import ProgressSection from '../sections/ProgressSection';

interface DashboardPageProps {
  user: User;
}

const DashboardPage: React.FC<DashboardPageProps> = ({ user }) => {
  const [currentView, setCurrentView] = useState<DashboardView>(DashboardView.Notes);

  const renderContent = () => {
    switch (currentView) {
      case DashboardView.Notes:
        return <NotesSection user={user} />;
      case DashboardView.AIChat:
        return <AIChatSection user={user} />;
      case DashboardView.Progress:
        return <ProgressSection user={user} />;
      default:
        return <NotesSection user={user} />;
    }
  };

  return (
    <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
        <div className="md:col-span-1">
          <Sidebar user={user} currentView={currentView} setCurrentView={setCurrentView} />
        </div>
        <div className="md:col-span-3">
          {renderContent()}
        </div>
      </div>
    </main>
  );
};

export default DashboardPage;