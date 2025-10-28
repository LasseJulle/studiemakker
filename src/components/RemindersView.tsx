import { useState, useEffect } from "react";
import { supabase } from "../lib/supabase";
import { useAuth } from "../contexts/AuthContext";
import { toast } from "sonner";
import { formatTimeAgo } from "../lib/utils";

interface Reminder {
  id: string;
  user_id: string;
  title: string;
  description: string | null;
  when: number;
  type: 'study' | 'review' | 'exam' | 'deadline';
  completed: boolean;
  note_id: string | null;
  created_at: string;
}

export default function RemindersView() {
  const { user } = useAuth();
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [filter, setFilter] = useState<"all" | "upcoming" | "completed">("upcoming");
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchReminders();
  }, [user]);

  const fetchReminders = async () => {
    if (!user) return;

    const { data, error } = await supabase
      .from('reminders')
      .select('*')
      .eq('user_id', user.id)
      .order('when', { ascending: true });

    if (error) {
      console.error('Error fetching reminders:', error);
    } else {
      setReminders(data || []);
    }
    setLoading(false);
  };

  const handleCreateReminder = async (data: any) => {
    if (!user) return;

    try {
      const { error } = await supabase
        .from('reminders')
        .insert({
          user_id: user.id,
          title: data.title,
          description: data.description || null,
          when: data.when,
          type: data.type,
          completed: false
        });

      if (error) throw error;

      await fetchReminders();
      setShowCreateForm(false);
      toast.success("Påmindelse oprettet!");
    } catch (error: any) {
      toast.error(error.message || "Kunne ikke oprette påmindelse");
    }
  };

  const handleComplete = async (reminderId: string) => {
    try {
      const { error } = await supabase
        .from('reminders')
        .update({ completed: true })
        .eq('id', reminderId);

      if (error) throw error;

      await fetchReminders();
      toast.success("Påmindelse markeret som færdig!");
    } catch (error: any) {
      toast.error(error.message || "Kunne ikke markere som færdig");
    }
  };

  const handleDelete = async (reminderId: string) => {
    if (!confirm("Slet denne påmindelse?")) return;

    try {
      const { error } = await supabase
        .from('reminders')
        .delete()
        .eq('id', reminderId);

      if (error) throw error;

      await fetchReminders();
      toast.success("Påmindelse slettet!");
    } catch (error: any) {
      toast.error(error.message || "Kunne ikke slette påmindelse");
    }
  };

  const downloadICS = (reminder: Reminder) => {
    const dtstart = new Date(reminder.when).toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
    const icsContent = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//StudyBuddy//Reminder//EN',
      'BEGIN:VEVENT',
      `UID:${reminder.id}@studybuddy.app`,
      `DTSTAMP:${new Date().toISOString().replace(/[-:]/g, '').split('.')[0]}Z`,
      `DTSTART:${dtstart}`,
      `SUMMARY:${reminder.title}`,
      reminder.description ? `DESCRIPTION:${reminder.description}` : '',
      'END:VEVENT',
      'END:VCALENDAR'
    ].filter(Boolean).join('\r\n');

    const blob = new Blob([icsContent], { type: 'text/calendar' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${reminder.title.replace(/\s+/g, '_')}.ics`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast.success("Kalender-fil downloadet!");
  };

  if (!user || loading) {
    return <div>Indlæser...</div>;
  }

  const filteredReminders = reminders?.filter(reminder => {
    if (filter === "completed") return reminder.completed;
    if (filter === "upcoming") return !reminder.completed && reminder.when > Date.now();
    return true;
  }) || [];

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-bold text-gray-900">Påmindelser</h2>
          <p className="text-gray-600">Administrer dine studiepåmindelser</p>
        </div>
        <button
          onClick={() => setShowCreateForm(true)}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
        >
          ⏰ Ny påmindelse
        </button>
      </div>

      {/* Filter Tabs */}
      <div className="flex space-x-1 bg-gray-100 rounded-lg p-1">
        {[
          { key: "upcoming", label: "Kommende" },
          { key: "all", label: "Alle" },
          { key: "completed", label: "Færdige" },
        ].map((tab) => (
          <button
            key={tab.key}
            onClick={() => setFilter(tab.key as any)}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              filter === tab.key
                ? "bg-white text-blue-600 shadow-sm"
                : "text-gray-600 hover:text-gray-900"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Create Form */}
      {showCreateForm && (
        <ReminderForm
          onSubmit={handleCreateReminder}
          onCancel={() => setShowCreateForm(false)}
        />
      )}

      {/* Reminders List */}
      <div className="space-y-4">
        {filteredReminders.length > 0 ? (
          filteredReminders.map((reminder) => (
            <ReminderCard
              key={reminder._id}
              reminder={reminder}
              onComplete={handleComplete}
              onDelete={handleDelete}
              onDownloadICS={downloadICS}
            />
          ))
        ) : (
          <div className="text-center py-12">
            <svg className="w-16 h-16 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              {filter === "upcoming" ? "Ingen kommende påmindelser" : "Ingen påmindelser"}
            </h3>
            <p className="text-gray-600 mb-4">
              Opret din første påmindelse for at holde styr på dine studier
            </p>
            <button
              onClick={() => setShowCreateForm(true)}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
            >
              Opret påmindelse
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function ReminderForm({ onSubmit, onCancel }: {
  onSubmit: (data: any) => void;
  onCancel: () => void;
}) {
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    when: "",
    type: "study" as const,
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({
      ...formData,
      when: new Date(formData.when).getTime(),
    });
  };

  // Default to 7 days from now
  const defaultDate = new Date();
  defaultDate.setDate(defaultDate.getDate() + 7);
  const defaultDateString = defaultDate.toISOString().slice(0, 16);

  return (
    <div className="bg-white rounded-lg shadow-sm border p-6">
      <h3 className="text-xl font-semibold text-gray-900 mb-4">Opret ny påmindelse</h3>
      
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Titel</label>
          <input
            type="text"
            value={formData.title}
            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="f.eks. Gennemgå matematik noter"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Beskrivelse</label>
          <textarea
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            rows={3}
            placeholder="Valgfri beskrivelse..."
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Dato og tid</label>
            <input
              type="datetime-local"
              value={formData.when || defaultDateString}
              onChange={(e) => setFormData({ ...formData, when: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
            <select
              value={formData.type}
              onChange={(e) => setFormData({ ...formData, type: e.target.value as any })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="study">Studiesession</option>
              <option value="review">Gennemgang</option>
              <option value="exam">Eksamen</option>
              <option value="deadline">Deadline</option>
            </select>
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
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            Opret påmindelse
          </button>
        </div>
      </form>
    </div>
  );
}

function ReminderCard({ reminder, onComplete, onDelete, onDownloadICS }: {
  reminder: any;
  onComplete: (id: string) => void;
  onDelete: (id: string) => void;
  onDownloadICS: (id: string) => void;
}) {
  const isOverdue = reminder.when < Date.now() && !reminder.completed;
  const isUpcoming = reminder.when > Date.now() && reminder.when < Date.now() + 24 * 60 * 60 * 1000;

  const typeEmojis = {
    study: "📚",
    review: "🔄",
    exam: "📝",
    deadline: "⏰",
  };

  return (
    <div className={`bg-white rounded-lg shadow-sm border p-4 ${
      isOverdue ? "border-red-200 bg-red-50" : 
      isUpcoming ? "border-yellow-200 bg-yellow-50" :
      reminder.completed ? "border-gray-200 bg-gray-50" : "border-gray-200"
    }`}>
      <div className="flex justify-between items-start">
        <div className="flex-1">
          <div className="flex items-center space-x-2 mb-2">
            <span className="text-lg">{typeEmojis[reminder.type as keyof typeof typeEmojis]}</span>
            <h3 className={`font-semibold ${reminder.completed ? "text-gray-500 line-through" : "text-gray-900"}`}>
              {reminder.title}
            </h3>
            {isOverdue && <span className="px-2 py-1 text-xs bg-red-100 text-red-800 rounded">Forsinket</span>}
            {isUpcoming && <span className="px-2 py-1 text-xs bg-yellow-100 text-yellow-800 rounded">I dag</span>}
          </div>
          
          {reminder.description && (
            <p className="text-gray-600 text-sm mb-2">{reminder.description}</p>
          )}
          
          <div className="flex items-center space-x-4 text-sm text-gray-500">
            <span>📅 {new Date(reminder.when).toLocaleString('da-DK')}</span>
            {reminder.noteTitle && (
              <span>📝 {reminder.noteTitle}</span>
            )}
          </div>
        </div>

        <div className="flex space-x-2">
          <button
            onClick={() => onDownloadICS(reminder._id)}
            className="text-blue-600 hover:text-blue-800 text-sm"
            title="Download til kalender"
          >
            📅
          </button>
          
          {!reminder.completed && (
            <button
              onClick={() => onComplete(reminder._id)}
              className="text-green-600 hover:text-green-800 text-sm"
              title="Marker som færdig"
            >
              ✓
            </button>
          )}
          
          <button
            onClick={() => onDelete(reminder._id)}
            className="text-red-600 hover:text-red-800 text-sm"
            title="Slet"
          >
            🗑️
          </button>
        </div>
      </div>
    </div>
  );
}
