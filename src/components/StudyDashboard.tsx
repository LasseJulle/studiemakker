import { useState, useEffect } from "react";
import { supabase } from "../lib/supabase";
import { useAuth } from "../contexts/AuthContext";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { toast } from "sonner";

interface Overview {
  totalNotes: number;
  averageGrade: number | null;
  totalPlans: number;
  planProgress: number;
  recentNotes: any[];
  activePlans: any[];
}

interface ProgressSummary {
  totalMinutes: number;
  streak: number;
  sessionsPerDay: number;
  dailyData: { date: string; minutes: number }[];
}

export default function StudyDashboard() {
  const { user, profile } = useAuth();
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [onboardingStep, setOnboardingStep] = useState(0);
  const [progressRange, setProgressRange] = useState<"week" | "month" | "all">("week");
  const [selectedSubject, setSelectedSubject] = useState("");
  const [subjects, setSubjects] = useState<string[]>([]);
  const [overview, setOverview] = useState<Overview | null>(null);
  const [progressSummary, setProgressSummary] = useState<ProgressSummary | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (profile && !profile.has_seen_intro) {
      setShowOnboarding(true);
    }
  }, [profile]);

  useEffect(() => {
    if (user) {
      fetchAllData();
    }
  }, [user, progressRange]);

  const fetchAllData = async () => {
    if (!user) return;

    setLoading(true);
    try {
      await Promise.all([
        fetchOverview(),
        fetchSubjects(),
        fetchProgressSummary()
      ]);
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchOverview = async () => {
    if (!user) return;

    // Fetch all data in parallel
    const [notesResult, plansResult] = await Promise.all([
      supabase.from('notes').select('*').eq('user_id', user.id),
      supabase.from('study_plans').select('*').eq('user_id', user.id)
    ]);

    const notes = notesResult.data || [];
    const plans = plansResult.data || [];

    // Calculate statistics
    const totalNotes = notes.length;
    const averageGrade = notes.filter(n => n.grade).length > 0
      ? notes.filter(n => n.grade).reduce((sum, n) => sum + n.grade, 0) / notes.filter(n => n.grade).length
      : null;

    const totalPlans = plans.length;
    const planProgress = plans.length > 0
      ? Math.round(plans.reduce((sum, plan) => {
          const completed = plan.tasks.filter((t: any) => t.completed).length;
          return sum + (completed / plan.tasks.length * 100);
        }, 0) / plans.length)
      : 0;

    // Recent notes (last 5)
    const recentNotes = notes
      .sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime())
      .slice(0, 5);

    // Active plans (plans within date range with progress < 100%)
    const now = Date.now();
    const activePlans = plans
      .filter(plan => plan.start_date <= now && plan.end_date >= now)
      .map(plan => ({
        ...plan,
        progress: Math.round((plan.tasks.filter((t: any) => t.completed).length / plan.tasks.length) * 100)
      }))
      .slice(0, 5);

    setOverview({
      totalNotes,
      averageGrade,
      totalPlans,
      planProgress,
      recentNotes,
      activePlans
    });
  };

  const fetchSubjects = async () => {
    if (!user) return;

    const { data, error } = await supabase
      .from('notes')
      .select('category')
      .eq('user_id', user.id)
      .not('category', 'is', null);

    if (!error && data) {
      const uniqueSubjects = [...new Set(data.map(d => d.category).filter(Boolean))];
      setSubjects(uniqueSubjects as string[]);
    }
  };

  const fetchProgressSummary = async () => {
    if (!user) return;

    const now = new Date();
    let startDate: Date;

    if (progressRange === 'week') {
      startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    } else if (progressRange === 'month') {
      startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    } else {
      startDate = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
    }

    const { data, error } = await supabase
      .from('progress_logs')
      .select('*')
      .eq('user_id', user.id)
      .gte('date', startDate.toISOString().split('T')[0])
      .order('date', { ascending: true });

    if (error || !data) {
      console.error('Error fetching progress:', error);
      return;
    }

    // Calculate stats
    const totalMinutes = data.reduce((sum, log) => sum + log.minutes, 0);

    // Calculate streak
    const dates = [...new Set(data.map(log => log.date))].sort().reverse();
    let streak = 0;
    const today = new Date().toISOString().split('T')[0];

    for (let i = 0; i < dates.length; i++) {
      const expectedDate = new Date(now.getTime() - i * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
      if (dates[i] === expectedDate) {
        streak++;
      } else {
        break;
      }
    }

    const sessionsPerDay = dates.length > 0 ? data.length / dates.length : 0;

    // Aggregate by date for chart
    const dailyMap = new Map<string, number>();
    data.forEach(log => {
      dailyMap.set(log.date, (dailyMap.get(log.date) || 0) + log.minutes);
    });

    const dailyData = Array.from(dailyMap.entries())
      .map(([date, minutes]) => ({ date, minutes }))
      .sort((a, b) => a.date.localeCompare(b.date));

    setProgressSummary({
      totalMinutes,
      streak,
      sessionsPerDay,
      dailyData
    });
  };

  const handleCompleteOnboarding = async () => {
    if (!user) return;

    try {
      await supabase
        .from('profiles')
        .update({ has_seen_intro: true })
        .eq('id', user.id);

      setShowOnboarding(false);
      toast.success("Velkommen til StudyBuddy! 🎉");
    } catch (error) {
      console.error('Error marking intro as seen:', error);
    }
  };

  const handleLogStudySession = async (minutes: number) => {
    if (!user) return;

    try {
      await supabase
        .from('progress_logs')
        .insert({
          user_id: user.id,
          minutes,
          activity_type: 'study',
          date: new Date().toISOString().split('T')[0]
        });

      await fetchProgressSummary();
      toast.success(`${minutes} minutters studietid logget! 📚`);
    } catch (error) {
      console.error('Error logging study session:', error);
      toast.error("Kunne ikke logge studietid");
    }
  };

  const getGradeBadge = (grade: number) => {
    if (grade >= 10) return { text: "A", color: "bg-green-600" };
    if (grade >= 7) return { text: "B", color: "bg-blue-600" };
    if (grade >= 4) return { text: "C", color: "bg-yellow-600" };
    if (grade >= 2) return { text: "D", color: "bg-orange-600" };
    if (grade >= 0) return { text: "E", color: "bg-red-600" };
    return { text: "F", color: "bg-gray-600" };
  };

  if (!user || loading || !overview) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-400"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 text-gray-100">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-white mb-2">📊 Dashboard</h1>
          <p className="text-gray-400">Dit personlige studieoverblik</p>
        </div>

        {/* Quick Study Timer */}
        <div className="mb-8 bg-gray-800 rounded-lg p-6 border border-gray-700">
          <h2 className="text-xl font-semibold text-white mb-4">⏱️ Hurtig Studietimer</h2>
          <div className="flex flex-wrap gap-3">
            {[15, 30, 45, 60, 90].map((minutes) => (
              <button
                key={minutes}
                onClick={() => handleLogStudySession(minutes)}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                {minutes} min
              </button>
            ))}
          </div>
        </div>

        {/* Progress Summary */}
        {progressSummary && (
          <div className="mb-8 bg-gray-800 rounded-lg p-6 border border-gray-700">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold text-white">📈 Studiefremskridt</h2>
              <div className="flex space-x-2">
                {(["week", "month", "all"] as const).map((range) => (
                  <button
                    key={range}
                    onClick={() => setProgressRange(range)}
                    className={`px-3 py-1 rounded text-sm transition-colors ${
                      progressRange === range
                        ? "bg-blue-600 text-white"
                        : "bg-gray-700 text-gray-300 hover:bg-gray-600"
                    }`}
                  >
                    {range === "week" ? "Uge" : range === "month" ? "Måned" : "Alt"}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
              <div className="bg-gray-700 rounded-lg p-4">
                <div className="text-2xl font-bold text-blue-400">{progressSummary.totalMinutes}</div>
                <div className="text-sm text-gray-400">Minutter studeret</div>
              </div>
              <div className="bg-gray-700 rounded-lg p-4">
                <div className="text-2xl font-bold text-green-400">{progressSummary.streak}</div>
                <div className="text-sm text-gray-400">Dages streak</div>
              </div>
              <div className="bg-gray-700 rounded-lg p-4">
                <div className="text-2xl font-bold text-purple-400">
                  {progressSummary.sessionsPerDay.toFixed(1)}
                </div>
                <div className="text-sm text-gray-400">Sessions per dag</div>
              </div>
            </div>

            {progressSummary.dailyData.length > 0 && (
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={progressSummary.dailyData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                    <XAxis
                      dataKey="date"
                      stroke="#9CA3AF"
                      tickFormatter={(value) => new Date(value).toLocaleDateString('da-DK', { month: 'short', day: 'numeric' })}
                    />
                    <YAxis stroke="#9CA3AF" />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: '#1F2937',
                        border: '1px solid #374151',
                        borderRadius: '8px',
                        color: '#F3F4F6'
                      }}
                      labelFormatter={(value) => new Date(value).toLocaleDateString('da-DK')}
                    />
                    <Line
                      type="monotone"
                      dataKey="minutes"
                      stroke="#3B82F6"
                      strokeWidth={2}
                      dot={{ fill: '#3B82F6', strokeWidth: 2, r: 4 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>
        )}

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-gray-800 rounded-lg p-6 border border-gray-700 hover:scale-105 transition-transform">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-400">Noter</p>
                <p className="text-2xl font-bold text-white">{overview.totalNotes}</p>
              </div>
              <div className="text-3xl">📝</div>
            </div>
          </div>

          <div className="bg-gray-800 rounded-lg p-6 border border-gray-700 hover:scale-105 transition-transform">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-400">Gennemsnitskarakter</p>
                <p className={`text-2xl font-bold ${
                  overview.averageGrade && overview.averageGrade >= 7 ? 'text-green-400' :
                  overview.averageGrade && overview.averageGrade >= 4 ? 'text-yellow-400' : 'text-red-400'
                }`}>
                  {overview.averageGrade ? `${overview.averageGrade.toFixed(1)}/10` : 'N/A'}
                </p>
              </div>
              <div className="text-3xl">⭐</div>
            </div>
          </div>

          <div className="bg-gray-800 rounded-lg p-6 border border-gray-700 hover:scale-105 transition-transform">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-400">Studieplaner</p>
                <p className="text-2xl font-bold text-white">{overview.totalPlans}</p>
              </div>
              <div className="text-3xl">📋</div>
            </div>
          </div>

          <div className="bg-gray-800 rounded-lg p-6 border border-gray-700 hover:scale-105 transition-transform">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-400">Fremgang</p>
                <div className="flex items-center space-x-2">
                  <p className={`text-2xl font-bold ${
                    overview.planProgress >= 70 ? 'text-green-400' :
                    overview.planProgress >= 40 ? 'text-yellow-400' : 'text-red-400'
                  }`}>
                    {overview.planProgress}%
                  </p>
                </div>
              </div>
              <div className="text-3xl">🎯</div>
            </div>
          </div>
        </div>

        {/* Recent Activity */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
            <h3 className="text-lg font-semibold text-white mb-4">📚 Seneste Noter</h3>
            <div className="space-y-3">
              {overview.recentNotes.map((note: any) => (
                <div key={note.id} className="flex items-center justify-between p-3 bg-gray-700 rounded-lg">
                  <div>
                    <p className="font-medium text-white">{note.title}</p>
                    <p className="text-sm text-gray-400">{note.category || 'Ingen kategori'}</p>
                  </div>
                  {note.grade && (
                    <span className="px-2 py-1 text-xs bg-yellow-600 text-white rounded">
                      {note.grade}/10
                    </span>
                  )}
                </div>
              ))}
              {overview.recentNotes.length === 0 && (
                <p className="text-gray-400 text-center py-4">Ingen noter endnu</p>
              )}
            </div>
          </div>

          <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
            <h3 className="text-lg font-semibold text-white mb-4">🎯 Aktive Planer</h3>
            <div className="space-y-3">
              {overview.activePlans.map((plan: any) => (
                <div key={plan.id} className="p-3 bg-gray-700 rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <p className="font-medium text-white">{plan.title}</p>
                    <span className="text-sm text-gray-400">{plan.progress}%</span>
                  </div>
                  <div className="w-full bg-gray-600 rounded-full h-2">
                    <div
                      className="bg-purple-600 h-2 rounded-full transition-all duration-300"
                      style={{ width: `${plan.progress}%` }}
                    />
                  </div>
                </div>
              ))}
              {overview.activePlans.length === 0 && (
                <p className="text-gray-400 text-center py-4">Ingen aktive planer</p>
              )}
            </div>
          </div>
        </div>

        {/* Onboarding Modal */}
        {showOnboarding && (
          <OnboardingModal
            step={onboardingStep}
            onNext={() => setOnboardingStep(onboardingStep + 1)}
            onComplete={handleCompleteOnboarding}
          />
        )}
      </div>
    </div>
  );
}

function OnboardingModal({ step, onNext, onComplete }: {
  step: number;
  onNext: () => void;
  onComplete: () => void;
}) {
  const slides = [
    {
      title: "Velkommen til StudyBuddy! 🎉",
      content: "Din personlige AI-drevne studieassistent. Lad os vise dig rundt i de vigtigste funktioner.",
      emoji: "👋"
    },
    {
      title: "Organiser dine noter 📝",
      content: "Opret, rediger og organiser dine studienoter med kategorier og tags. AI kan hjælpe med at forbedre og vurdere dine noter.",
      emoji: "📚"
    },
    {
      title: "Spor din fremgang 📊",
      content: "Se din studieaktivitet, karakterer og fremgang i real-time. Sæt mål og følg din udvikling over tid.",
      emoji: "🎯"
    }
  ];

  const currentSlide = slides[step];
  const isLastSlide = step === slides.length - 1;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-gray-800 rounded-lg max-w-md w-full p-6 border border-gray-700">
        <div className="text-center">
          <div className="text-6xl mb-4">{currentSlide.emoji}</div>
          <h3 className="text-xl font-semibold text-white mb-4">{currentSlide.title}</h3>
          <p className="text-gray-300 mb-6">{currentSlide.content}</p>

          <div className="flex justify-center space-x-2 mb-6">
            {slides.map((_, index) => (
              <div
                key={index}
                className={`w-2 h-2 rounded-full ${
                  index === step ? 'bg-blue-600' : 'bg-gray-600'
                }`}
              />
            ))}
          </div>

          <button
            onClick={isLastSlide ? onComplete : onNext}
            className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            {isLastSlide ? 'Kom i gang! 🚀' : 'Næste'}
          </button>
        </div>
      </div>
    </div>
  );
}
