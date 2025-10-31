import { useState, useEffect } from "react";
import { supabase } from "../lib/supabase";
import { useAuth } from "../contexts/AuthContext";
import { toast } from "sonner";
import { formatTimeAgo } from "../lib/utils";

interface StudyPlan {
  id: string;
  user_id: string;
  title: string;
  description: string | null;
  subject: string;
  start_date: number;
  end_date: number;
  tasks: any[];
  created_at: string;
  updated_at: string;
}

export default function StudyPlans() {
  const { user } = useAuth();
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<StudyPlan | null>(null);
  const [studyPlans, setStudyPlans] = useState<StudyPlan[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchPlans();
  }, [user]);

  const fetchPlans = async () => {
    if (!user) return;

    const { data, error } = await supabase
      .from('study_plans')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching study plans:', error);
    } else {
      setStudyPlans(data || []);
    }
    setLoading(false);
  };

  const handleCreatePlan = async (data: any) => {
    if (!user) return;

    try {
      const tasksWithIds = data.tasks.map((task: any, idx: number) => ({
        ...task,
        id: `task-${Date.now()}-${idx}`,
        completed: false
      }));

      const { error } = await supabase
        .from('study_plans')
        .insert({
          user_id: user.id,
          title: data.title,
          description: data.description || null,
          subject: data.subject,
          start_date: data.startDate,
          end_date: data.endDate,
          tasks: tasksWithIds
        });

      if (error) throw error;

      await fetchPlans();
      setShowCreateForm(false);
      toast.success("Studieplan oprettet!");
    } catch (error: any) {
      toast.error(error.message || "Kunne ikke oprette studieplan");
    }
  };

  const handleToggleTask = async (planId: string, taskId: string, completed: boolean) => {
    try {
      const plan = studyPlans.find(p => p.id === planId);
      if (!plan) return;

      const updatedTasks = plan.tasks.map(task =>
        task.id === taskId ? { ...task, completed } : task
      );

      const { error } = await supabase
        .from('study_plans')
        .update({
          tasks: updatedTasks,
          updated_at: new Date().toISOString()
        })
        .eq('id', planId);

      if (error) throw error;

      await fetchPlans();
      if (selectedPlan?.id === planId) {
        setSelectedPlan({ ...plan, tasks: updatedTasks });
      }
      toast.success(completed ? "Opgave markeret som færdig!" : "Opgave markeret som ikke færdig");
    } catch (error: any) {
      toast.error(error.message || "Kunne ikke opdatere opgave");
    }
  };

  const handleDeletePlan = async (planId: string) => {
    if (!confirm("Slet denne studieplan?")) return;

    try {
      const { error } = await supabase
        .from('study_plans')
        .delete()
        .eq('id', planId);

      if (error) throw error;

      await fetchPlans();
      if (selectedPlan?.id === planId) {
        setSelectedPlan(null);
      }
      toast.success("Studieplan slettet!");
    } catch (error: any) {
      toast.error(error.message || "Kunne ikke slette studieplan");
    }
  };

  if (!user || loading) {
    return <div>Indlæser...</div>;
  }

  if (selectedPlan) {
    return (
      <PlanDetailView
        plan={selectedPlan}
        onBack={() => setSelectedPlan(null)}
        onToggleTask={handleToggleTask}
        onDelete={handleDeletePlan}
      />
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-bold text-gray-900">Studieplaner</h2>
          <p className="text-gray-600">Organiser og følg dine studiemål</p>
        </div>
        <button
          onClick={() => setShowCreateForm(true)}
          className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors"
        >
          📋 Ny plan
        </button>
      </div>

      {/* Create Form */}
      {showCreateForm && (
        <CreatePlanForm
          onSubmit={handleCreatePlan}
          onCancel={() => setShowCreateForm(false)}
        />
      )}

      {/* Plans Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {studyPlans && studyPlans.length > 0 ? (
          studyPlans.map((plan) => (
            <PlanCard
              key={plan.id}
              plan={plan}
              onClick={() => setSelectedPlan(plan)}
              onDelete={handleDeletePlan}
            />
          ))
        ) : (
          <div className="col-span-full text-center py-12">
            <svg className="w-16 h-16 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
            </svg>
            <h3 className="text-lg font-medium text-gray-900 mb-2">Ingen studieplaner endnu</h3>
            <p className="text-gray-600 mb-4">Opret din første studieplan for at komme i gang</p>
            <button
              onClick={() => setShowCreateForm(true)}
              className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors"
            >
              Opret studieplan
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function CreatePlanForm({ onSubmit, onCancel }: {
  onSubmit: (data: any) => void;
  onCancel: () => void;
}) {
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    subject: "",
    startDate: "",
    endDate: "",
    tasks: [{ title: "", description: "", estimatedMinutes: 60 }],
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({
      ...formData,
      startDate: new Date(formData.startDate).getTime(),
      endDate: new Date(formData.endDate).getTime(),
    });
  };

  const addTask = () => {
    setFormData({
      ...formData,
      tasks: [...formData.tasks, { title: "", description: "", estimatedMinutes: 60 }],
    });
  };

  const removeTask = (index: number) => {
    setFormData({
      ...formData,
      tasks: formData.tasks.filter((_, i) => i !== index),
    });
  };

  const updateTask = (index: number, field: string, value: any) => {
    const newTasks = [...formData.tasks];
    newTasks[index] = { ...newTasks[index], [field]: value };
    setFormData({ ...formData, tasks: newTasks });
  };

  // Default dates
  const today = new Date().toISOString().split('T')[0];
  const nextWeek = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

  return (
    <div className="bg-white rounded-lg shadow-sm border p-6">
      <h3 className="text-xl font-semibold text-gray-900 mb-4">Opret ny studieplan</h3>
      
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Titel</label>
            <input
              type="text"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
              placeholder="f.eks. Matematik eksamensforberedelse"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Fag</label>
            <input
              type="text"
              value={formData.subject}
              onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
              placeholder="f.eks. Matematik"
              required
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Beskrivelse</label>
          <textarea
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
            rows={3}
            placeholder="Beskriv formålet med denne studieplan..."
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Startdato</label>
            <input
              type="date"
              value={formData.startDate || today}
              onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Slutdato</label>
            <input
              type="date"
              value={formData.endDate || nextWeek}
              onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
              required
            />
          </div>
        </div>

        {/* Tasks */}
        <div>
          <div className="flex justify-between items-center mb-3">
            <label className="block text-sm font-medium text-gray-700">Opgaver</label>
            <button
              type="button"
              onClick={addTask}
              className="text-green-600 hover:text-green-800 text-sm"
            >
              + Tilføj opgave
            </button>
          </div>
          
          <div className="space-y-3">
            {formData.tasks.map((task, index) => (
              <div key={index} className="border border-gray-200 rounded-lg p-3">
                <div className="flex justify-between items-start mb-2">
                  <span className="text-sm font-medium text-gray-700">Opgave {index + 1}</span>
                  {formData.tasks.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeTask(index)}
                      className="text-red-600 hover:text-red-800 text-sm"
                    >
                      Fjern
                    </button>
                  )}
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <input
                    type="text"
                    value={task.title}
                    onChange={(e) => updateTask(index, "title", e.target.value)}
                    className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                    placeholder="Opgavetitel"
                    required
                  />
                  <input
                    type="text"
                    value={task.description}
                    onChange={(e) => updateTask(index, "description", e.target.value)}
                    className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                    placeholder="Beskrivelse (valgfri)"
                  />
                  <div className="flex items-center space-x-2">
                    <input
                      type="number"
                      value={task.estimatedMinutes}
                      onChange={(e) => updateTask(index, "estimatedMinutes", parseInt(e.target.value))}
                      className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                      min={15}
                      step={15}
                    />
                    <span className="text-sm text-gray-500">min</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="flex justify-end space-x-3">
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 text-gray-600 border border-gray-300 rounded hover:bg-gray-50"
          >
            Annuller
          </button>
          <button
            type="submit"
            className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
          >
            Opret plan
          </button>
        </div>
      </form>
    </div>
  );
}

function PlanCard({ plan, onClick, onDelete }: {
  plan: StudyPlan;
  onClick: () => void;
  onDelete: (id: string) => void;
}) {
  const completedTasks = plan.tasks.filter((task: any) => task.completed).length;
  const totalTasks = plan.tasks.length;
  const progress = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

  const isActive = plan.start_date <= Date.now() && plan.end_date >= Date.now();
  const isOverdue = plan.end_date < Date.now() && progress < 100;

  return (
    <div className={`bg-white rounded-lg shadow-sm border p-6 cursor-pointer hover:shadow-md transition-shadow ${
      isOverdue ? "border-red-200" : isActive ? "border-green-200" : "border-gray-200"
    }`}>
      <div className="flex justify-between items-start mb-3">
        <div onClick={onClick} className="flex-1">
          <h3 className="font-semibold text-gray-900 mb-1">{plan.title}</h3>
          <p className="text-sm text-gray-600">{plan.subject}</p>
        </div>
        <button
          onClick={(e) => {
            e.stopPropagation();
            onDelete(plan.id);
          }}
          className="text-gray-400 hover:text-red-600"
        >
          🗑️
        </button>
      </div>

      <div onClick={onClick}>
        {plan.description && (
          <p className="text-sm text-gray-600 mb-3 line-clamp-2">{plan.description}</p>
        )}

        <div className="mb-3">
          <div className="flex justify-between items-center mb-1">
            <span className="text-sm text-gray-600">Fremgang</span>
            <span className="text-sm font-medium">{progress}%</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div 
              className={`h-2 rounded-full transition-all duration-300 ${
                progress === 100 ? "bg-green-600" : 
                isOverdue ? "bg-red-600" : "bg-blue-600"
              }`}
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        <div className="flex justify-between items-center text-sm text-gray-500">
          <span>{completedTasks}/{totalTasks} opgaver</span>
          <span>
            {isOverdue ? "Forsinket" :
             isActive ? "Aktiv" :
             plan.start_date > Date.now() ? "Kommende" : "Færdig"}
          </span>
        </div>

        <div className="mt-2 text-xs text-gray-400">
          {new Date(plan.start_date).toLocaleDateString('da-DK')} - {new Date(plan.end_date).toLocaleDateString('da-DK')}
        </div>
      </div>
    </div>
  );
}

function PlanDetailView({ plan, onBack, onToggleTask, onDelete }: {
  plan: StudyPlan;
  onBack: () => void;
  onToggleTask: (planId: string, taskId: string, completed: boolean) => void;
  onDelete: (id: string) => void;
}) {
  const completedTasks = plan.tasks.filter((task: any) => task.completed).length;
  const totalTasks = plan.tasks.length;
  const progress = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

  const totalEstimatedMinutes = plan.tasks.reduce((sum: number, task: any) => sum + (task.estimatedMinutes || 0), 0);
  const completedMinutes = plan.tasks
    .filter((task: any) => task.completed)
    .reduce((sum: number, task: any) => sum + (task.estimatedMinutes || 0), 0);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-start">
        <div>
          <button
            onClick={onBack}
            className="text-gray-600 hover:text-gray-900 mb-2"
          >
            ← Tilbage til planer
          </button>
          <h2 className="text-3xl font-bold text-gray-900">{plan.title}</h2>
          <p className="text-gray-600">{plan.subject}</p>
        </div>
        <button
          onClick={() => onDelete(plan.id)}
          className="text-red-600 hover:text-red-800"
        >
          🗑️ Slet plan
        </button>
      </div>

      {plan.description && (
        <div className="bg-gray-50 rounded-lg p-4">
          <p className="text-gray-700">{plan.description}</p>
        </div>
      )}

      {/* Progress Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white rounded-lg shadow-sm border p-6">
          <h3 className="font-medium text-gray-900 mb-2">Fremgang</h3>
          <div className="text-3xl font-bold text-blue-600 mb-2">{progress}%</div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div 
              className="bg-blue-600 h-2 rounded-full transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border p-6">
          <h3 className="font-medium text-gray-900 mb-2">Opgaver</h3>
          <div className="text-3xl font-bold text-green-600 mb-2">{completedTasks}/{totalTasks}</div>
          <p className="text-sm text-gray-600">færdige opgaver</p>
        </div>

        <div className="bg-white rounded-lg shadow-sm border p-6">
          <h3 className="font-medium text-gray-900 mb-2">Tid</h3>
          <div className="text-3xl font-bold text-purple-600 mb-2">
            {Math.round(completedMinutes / 60)}h
          </div>
          <p className="text-sm text-gray-600">af {Math.round(totalEstimatedMinutes / 60)}h estimeret</p>
        </div>
      </div>

      {/* Tasks List */}
      <div className="bg-white rounded-lg shadow-sm border">
        <div className="p-6 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">Opgaver</h3>
        </div>
        <div className="divide-y divide-gray-200">
          {plan.tasks.map((task: any) => (
            <div key={task.id} className="p-6 flex items-start space-x-4">
              <input
                type="checkbox"
                checked={task.completed}
                onChange={(e) => onToggleTask(plan.id, task.id, e.target.checked)}
                className="mt-1 h-4 w-4 text-green-600 focus:ring-green-500 border-gray-300 rounded"
              />
              <div className="flex-1">
                <h4 className={`font-medium ${task.completed ? "text-gray-500 line-through" : "text-gray-900"}`}>
                  {task.title}
                </h4>
                {task.description && (
                  <p className="text-sm text-gray-600 mt-1">{task.description}</p>
                )}
                <div className="flex items-center space-x-4 mt-2 text-sm text-gray-500">
                  {task.estimatedMinutes && (
                    <span>⏱️ {task.estimatedMinutes} min</span>
                  )}
                  {task.dueDate && (
                    <span>📅 {new Date(task.dueDate).toLocaleDateString('da-DK')}</span>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Plan Timeline */}
      <div className="bg-white rounded-lg shadow-sm border p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Tidsplan</h3>
        <div className="flex items-center justify-between text-sm">
          <div>
            <span className="font-medium">Start:</span> {new Date(plan.start_date).toLocaleDateString('da-DK')}
          </div>
          <div>
            <span className="font-medium">Slut:</span> {new Date(plan.end_date).toLocaleDateString('da-DK')}
          </div>
        </div>
        <div className="mt-2 text-xs text-gray-500">
          Oprettet {formatTimeAgo(new Date(plan.created_at).getTime())} • Sidst opdateret {formatTimeAgo(new Date(plan.updated_at).getTime())}
        </div>
      </div>
    </div>
  );
}
