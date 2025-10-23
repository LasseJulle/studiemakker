import * as React from 'react';
import { DashboardView, User } from '../types';
import { BookOpenIcon } from './icons/BookOpenIcon';
import { ChatBubbleIcon } from './icons/ChatBubbleIcon';
import { ChartBarIcon } from './icons/ChartBarIcon';

interface SidebarProps {
  user: User;
  currentView: DashboardView;
  setCurrentView: (view: DashboardView) => void;
}

const navItems = [
  { view: DashboardView.Notes, label: 'Mine Noter', icon: BookOpenIcon },
  { view: DashboardView.AIChat, label: 'AI-hjælp', icon: ChatBubbleIcon },
  { view: DashboardView.Progress, label: 'Min Progression', icon: ChartBarIcon },
];

const Sidebar: React.FC<SidebarProps> = ({ user, currentView, setCurrentView }) => {
  return (
    <aside>
      <div className="p-3 mb-4 bg-gray-100 rounded-lg">
        <h3 className="text-sm font-semibold text-gray-800 truncate" title={user.email || ''}>
          {user.display_name || user.email}
        </h3>
        <span className={`inline-block mt-1 text-xs font-medium px-2 py-0.5 rounded-full ${
          user.is_premium
            ? 'bg-yellow-200 text-yellow-800'
            : 'bg-gray-200 text-gray-700'
        }`}>
          {user.is_premium ? 'Premium' : 'Gratis'}
        </span>
      </div>
      <nav className="space-y-1" aria-label="Sidebar">
        {navItems.map((item) => {
          const isActive = currentView === item.view;
          const Icon = item.icon;
          return (
            <button
              key={item.view}
              onClick={() => setCurrentView(item.view)}
              className={`w-full flex items-center px-3 py-3 text-sm font-medium rounded-md text-left transition-colors ${
                isActive
                  ? 'bg-blue-100 text-blue-700'
                  : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
              }`}
            >
              <Icon className={`mr-3 flex-shrink-0 h-6 w-6 ${isActive ? 'text-blue-500' : 'text-gray-400'}`} />
              <span className="truncate">{item.label}</span>
            </button>
          );
        })}
      </nav>
    </aside>
  );
};

export default Sidebar;