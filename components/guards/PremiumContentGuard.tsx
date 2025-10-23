import * as React from 'react';
import { Link } from 'react-router-dom';
import { User } from '../../types';

interface PremiumContentGuardProps {
  user: User;
  children: React.ReactNode;
}

const PremiumContentGuard: React.FC<PremiumContentGuardProps> = ({ user, children }) => {
  if (user.is_premium) {
    return <>{children}</>;
  }

  return (
    <div className="p-6 bg-yellow-50 border-l-4 border-yellow-400 rounded-r-lg shadow-sm">
      <div className="flex">
        <div className="flex-shrink-0">
          <svg className="h-6 w-6 text-yellow-500" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
            <path fillRule="evenodd" d="M8.485 2.495c.673-1.167 2.357-1.167 3.03 0l6.28 10.875c.673 1.167-.17 2.625-1.516 2.625H3.72c-1.347 0-2.189-1.458-1.515-2.625L8.485 2.495zM10 5a.75.75 0 01.75.75v3.5a.75.75 0 01-1.5 0v-3.5A.75.75 0 0110 5zm0 9a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" />
          </svg>
        </div>
        <div className="ml-4">
          <h3 className="text-lg font-medium text-yellow-800">Premium Funktion</h3>
          <div className="mt-2 text-sm text-yellow-700">
            <p>Dette indhold er kun for Premium-brugere. Opgrader din konto for at få fuld adgang til alle værktøjer og funktioner.</p>
          </div>
          <div className="mt-4">
            <Link 
              to="/opgrader" 
              className="inline-block px-5 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
            >
              Opgrader til Premium
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PremiumContentGuard;