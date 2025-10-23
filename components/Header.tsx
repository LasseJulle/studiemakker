import * as React from 'react';
import { Link } from 'react-router-dom';
import { User } from '../types';
import { LogoutIcon } from './icons/LogoutIcon';

interface HeaderProps {
  user: User;
  onLogout: () => void;
}

const Header: React.FC<HeaderProps> = ({ user, onLogout }) => {
  return (
    <header className="bg-white shadow-sm sticky top-0 z-10">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <div className="flex-shrink-0">
            <Link to="/" className="text-2xl font-bold text-blue-600">
              StudieHjælperen
            </Link>
          </div>
          <div className="flex items-center space-x-4">
            <Link 
              to="/opgrader"
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
            >
              Opgrader til Premium
            </Link>
            <span className="text-sm text-gray-600 hidden sm:block">
              Velkommen, {user.email || 'bruger'}
            </span>
            <button
              onClick={onLogout}
              className="p-2 text-gray-500 rounded-full hover:bg-gray-100 hover:text-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              aria-label="Log ud"
            >
              <LogoutIcon className="h-6 w-6" />
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;
