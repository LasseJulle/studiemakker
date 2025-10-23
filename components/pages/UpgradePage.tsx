import * as React from 'react';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { stripeClient } from '../../services/stripeClient';

// Icon component defined locally to avoid creating new files
const CheckCircleIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" {...props}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>
);


const UpgradePage: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  // In a real app, this would be fetched from your backend/Stripe
  const premiumPriceId = 'price_premium_monthly'; 

  const handleUpgrade = async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await stripeClient.redirectToCheckout(premiumPriceId);
      if (result.error) {
        throw new Error(result.error.message);
      }
      // On success, navigate to the success page using React Router
      navigate('/betaling-succes');
    } catch (err: any) {
      setError(err.message || 'Der opstod en uventet fejl.');
      setLoading(false);
    }
  };

  return (
    <div className="bg-white">
      <div className="max-w-4xl mx-auto py-16 px-4 sm:py-24 sm:px-6 lg:px-8">
        <div className="text-center">
          <h1 className="text-4xl font-extrabold text-gray-900 sm:text-5xl sm:tracking-tight lg:text-6xl">
            Opgrader til Premium
          </h1>
          <p className="mt-5 max-w-xl mx-auto text-xl text-gray-500">
            Få adgang til alle funktioner og frigør dit fulde potentiale.
          </p>
        </div>

        <div className="mt-12 bg-gray-50 rounded-lg shadow-lg p-8">
          <h2 className="text-2xl font-bold text-gray-900 text-center">Premium Plan</h2>
          <div className="mt-8 flex justify-center">
            <p className="text-5xl font-extrabold text-gray-900">
              49 kr<span className="text-xl font-medium text-gray-500">/md</span>
            </p>
          </div>
          <ul className="mt-8 space-y-4">
            <li className="flex items-start">
              <div className="flex-shrink-0">
                <CheckCircleIcon className="h-6 w-6 text-green-500" />
              </div>
              <p className="ml-3 text-base text-gray-700">Ubegrænset adgang til AI-hjælp</p>
            </li>
            <li className="flex items-start">
              <div className="flex-shrink-0">
                <CheckCircleIcon className="h-6 w-6 text-green-500" />
              </div>
              <p className="ml-3 text-base text-gray-700">Avanceret progressions-sporing</p>
            </li>
            <li className="flex items-start">
              <div className="flex-shrink-0">
                <CheckCircleIcon className="h-6 w-6 text-green-500" />
              </div>
              <p className="ml-3 text-base text-gray-700">Prioriteret support</p>
            </li>
          </ul>
          <div className="mt-10">
            <button
              onClick={handleUpgrade}
              disabled={loading}
              className="w-full bg-blue-600 border border-transparent rounded-md py-3 px-8 flex items-center justify-center text-base font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
            >
              {loading ? 'Behandler...' : 'Opgrader nu'}
            </button>
          </div>
          {error && <p className="mt-4 text-center text-red-600">{error}</p>}
        </div>
      </div>
    </div>
  );
};

export default UpgradePage;