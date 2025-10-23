import * as React from 'react';
import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { User } from '../../types';
import { supabase } from '../../lib/supabase/client';

const CheckCircleIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" {...props}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>
);

const ErrorIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" {...props}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
  </svg>
);


interface PaymentSuccessPageProps {
  user: User;
  refreshUser: () => void;
}

const PaymentSuccessPage: React.FC<PaymentSuccessPageProps> = ({ user, refreshUser }) => {
  const navigate = useNavigate();
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    const upgradeUser = async () => {
        if (!user || user.is_premium) {
            setStatus('success'); // Already premium or no user, treat as success
            refreshUser();
            return;
        }

        const { error } = await supabase
            .from('profiles')
            .update({ is_premium: true })
            .eq('id', user.id);

        if (error) {
            console.error("Fejl ved opgradering af bruger:", error);
            setErrorMessage('Vi kunne desværre ikke opdatere din profil. Kontakt venligst support.');
            setStatus('error');
        } else {
            setStatus('success');
            refreshUser(); // Refresh user state in App.tsx
        }
    };

    upgradeUser();
  }, [user, refreshUser]);


  useEffect(() => {
    if (status === 'success') {
      const timer = setTimeout(() => {
        navigate('/');
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [status, navigate]);

  if (status === 'loading') {
    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50">
            <div className="text-center">
                <p className="text-lg text-gray-700">Bekræfter din opgradering...</p>
            </div>
        </div>
    );
  }

  if (status === 'error') {
     return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50">
            <div className="max-w-md w-full bg-white p-8 rounded-lg shadow-lg text-center">
                <ErrorIcon className="mx-auto h-16 w-16 text-red-500" />
                <h1 className="mt-4 text-3xl font-bold text-gray-900">Opgradering Fejlede</h1>
                <p className="mt-2 text-gray-600">{errorMessage}</p>
                <div className="mt-6">
                <Link
                    to="/"
                    className="inline-block px-6 py-3 bg-blue-600 text-white font-medium rounded-md hover:bg-blue-700"
                >
                    Tilbage til dashboard
                </Link>
                </div>
            </div>
        </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-md w-full bg-white p-8 rounded-lg shadow-lg text-center">
        <CheckCircleIcon className="mx-auto h-16 w-16 text-green-500" />
        <h1 className="mt-4 text-3xl font-bold text-gray-900">Betaling Gennemført!</h1>
        <p className="mt-2 text-gray-600">
          Tak! Din konto er nu blevet opgraderet til Premium. Du har adgang til alle funktioner.
        </p>
        <p className="mt-4 text-sm text-gray-500">Du vil blive sendt videre til dit dashboard om et øjeblik...</p>
        <div className="mt-6">
          <Link
            to="/"
            className="inline-block px-6 py-3 bg-blue-600 text-white font-medium rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            Gå til mit dashboard
          </Link>
        </div>
      </div>
    </div>
  );
};

export default PaymentSuccessPage;