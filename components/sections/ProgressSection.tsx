import * as React from 'react';
import { useState, useEffect, useMemo, useCallback } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { User, ProgressLog } from '../../types';
import { supabase } from '../../lib/supabase/client';
import { FireIcon } from '../icons/FireIcon';

interface ProgressSectionProps {
  user: User;
}

const StatCard: React.FC<{ title: string; value: string | number; icon?: React.ReactNode }> = ({ title, value, icon }) => (
    <div className="bg-white p-4 rounded-lg shadow-sm text-center flex flex-col justify-center">
        <h3 className="text-sm font-medium text-gray-500">{title}</h3>
        <div className="flex items-center justify-center mt-2">
            {icon && <div className="mr-2">{icon}</div>}
            <p className="text-2xl font-bold text-gray-800">{value}</p>
        </div>
    </div>
);

// Helper function to extract a meaningful error message from any caught value.
const getErrorMessage = (error: unknown): string => {
    if (error instanceof Error) {
        return error.message;
    }
    if (error && typeof error === 'object' && 'message' in error) {
        return String((error as { message: unknown }).message);
    }
    if (typeof error === 'string') {
        return error;
    }
    return 'En ukendt fejl opstod.';
};


const ProgressSection: React.FC<ProgressSectionProps> = ({ user }) => {
  const [logs, setLogs] = useState<ProgressLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const toISODateString = (date: Date) => date.toISOString().split('T')[0];

  const fetchProgress = useCallback(async () => {
    setError(null);
    try {
      const today = new Date();
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(today.getDate() - 30);

      const { data, error: supabaseError } = await supabase
        .from('progress_logs')
        .select('*')
        .eq('user_id', user.id)
        .gte('date', toISODateString(thirtyDaysAgo))
        .order('date', { ascending: false });

      if (supabaseError) {
        throw supabaseError;
      }

      setLogs((data as ProgressLog[]) || []);
    } catch (err: unknown) {
      const errorMessage = getErrorMessage(err);
      console.error('Fejl ved hentning af progression:', err);
      setError(`Kunne ikke hente dine progressionsdata. Fejl: ${errorMessage}`);
    }
  }, [user.id]);

  useEffect(() => {
    const initialLoad = async () => {
        setLoading(true);
        try {
            await fetchProgress();
        } finally {
            setLoading(false);
        }
    };
    initialLoad();
  }, [fetchProgress]);

  const handleAddMinutes = async (minutes: number) => {
    setActionLoading(true);
    setError(null);
    try {
      const { error: rpcError } = await supabase.rpc('increment_study_minutes', { minutes_to_add: minutes });

      if (rpcError) {
        throw rpcError;
      }
      await fetchProgress(); // Genindlæs data for at vise opdateringen
    } catch (err: unknown) {
      const errorMessage = getErrorMessage(err);
      console.error('Fejl ved registrering af studietid:', err);
      setError(`Kunne ikke registrere studietid. Fejl: ${errorMessage}`);
    } finally {
      setActionLoading(false);
    }
  };

  const { todayLog, weeklyMinutes, streak, chartData } = useMemo(() => {
    if (!logs) return { todayLog: null, weeklyMinutes: 0, streak: 0, chartData: [] };

    // FIX: Explicitly type the Map to aid TypeScript's type inference within the useMemo hook.
    // This ensures that values retrieved from the map are correctly typed as ProgressLog | undefined.
    const logsByDate = new Map<string, ProgressLog>(logs.map(log => [log.date, log]));
    
    const todayStr = toISODateString(new Date());
    const todayLog = logsByDate.get(todayStr) || null;

    let weeklyMinutes = 0;
    const chartData = [];
    const dayLabels = ['Søn', 'Man', 'Tir', 'Ons', 'Tor', 'Fre', 'Lør'];
    for (let i = 6; i >= 0; i--) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        const dateStr = toISODateString(d);
        const log = logsByDate.get(dateStr);
        const minutes = log?.minutes || 0;
        
        if (i >= 0) { // Kun tæl de sidste 7 dage for ugetotal
          weeklyMinutes += minutes;
        }
        
        chartData.push({
            name: dayLabels[d.getDay()],
            minutter: minutes,
        });
    }

    let streak = 0;
    const activeDates = new Set(logs.filter(l => l.minutes > 0).map(l => l.date));
    let currentDate = new Date();
    
    // En streak fortsætter, hvis du har studeret i dag ELLER i går.
    if (!activeDates.has(toISODateString(currentDate))) {
      currentDate.setDate(currentDate.getDate() - 1);
    }
    
    while(activeDates.has(toISODateString(currentDate))) {
      streak++;
      currentDate.setDate(currentDate.getDate() - 1);
    }
    
    return { todayLog, weeklyMinutes, streak, chartData };
  }, [logs]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-gray-600">Indlæser progression...</p>
      </div>
    );
  }

  return (
    <div>
      <h2 className="text-3xl font-bold text-gray-800 mb-6">Min Progression</h2>

      {error && (
        <div className="p-4 mb-6 bg-red-100 border border-red-400 text-red-700 rounded-lg" role="alert">
          <p className="font-bold">Der opstod en fejl</p>
          <p>{error}</p>
        </div>
      )}

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <StatCard title="Dagens Studietid" value={`${todayLog?.minutes || 0} min`} />
        <StatCard title="Noter i dag" value={`${todayLog?.notes_created || 0}`} />
        <StatCard title="Ugentlig Total" value={`${weeklyMinutes} min`} />
        <StatCard title="Streak" value={`${streak} dage`} icon={<FireIcon className="h-6 w-6 text-orange-500" />} />
      </div>

      <div className="bg-gray-50 p-4 rounded-lg border border-gray-200 mb-6">
        <h3 className="text-base font-semibold text-gray-700 mb-3">Registrér Aktivitet</h3>
        <div className="flex flex-wrap gap-3">
          <button 
            onClick={() => handleAddMinutes(25)}
            disabled={actionLoading}
            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {actionLoading ? 'Registrerer...' : '+ Tilføj 25 min nu'}
          </button>
          <button 
            disabled={actionLoading}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Registrér manuelt
          </button>
        </div>
      </div>
      
      <div className="bg-white p-4 sm:p-6 rounded-lg shadow-sm">
        <h3 className="text-xl font-semibold text-gray-700 mb-4">Ugentlig Aktivitet (Minutter)</h3>
        <div style={{ width: '100%', height: 300 }}>
          <ResponsiveContainer>
            <BarChart
              data={chartData}
              margin={{ top: 5, right: 20, left: -10, bottom: 5 }}
            >
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="name" tick={{ fill: '#6b7280', fontSize: 12 }} />
              <YAxis tick={{ fill: '#6b7280', fontSize: 12 }} />
              <Tooltip
                contentStyle={{ 
                  borderRadius: '0.5rem', 
                  boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)',
                  border: '1px solid #e5e7eb'
                }} 
              />
              <Bar dataKey="minutter" name="Studietid" fill="#3b82f6" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
};

export default ProgressSection;