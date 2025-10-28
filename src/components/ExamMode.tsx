import { useState, useEffect } from "react";
import { supabase } from "../lib/supabase";
import { useAuth } from "../contexts/AuthContext";
import { toast } from "sonner";

interface Note {
  id: string;
  title: string;
  content: string;
  category: string | null;
  tags: string[] | null;
}

export default function ExamMode() {
  const { user } = useAuth();
  const [isActive, setIsActive] = useState(false);
  const [timeLeft, setTimeLeft] = useState(0);
  const [selectedNotes, setSelectedNotes] = useState<string[]>([]);
  const [examDuration, setExamDuration] = useState(120); // minutes
  const [showSetup, setShowSetup] = useState(true);
  const [notes, setNotes] = useState<Note[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchNotes = async () => {
      if (!user) return;

      const { data, error } = await supabase
        .from('notes')
        .select('id, title, content, category, tags')
        .eq('user_id', user.id)
        .order('updated_at', { ascending: false });

      if (error) {
        console.error('Error fetching notes:', error);
      } else {
        setNotes(data || []);
      }
      setLoading(false);
    };

    fetchNotes();
  }, [user]);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    
    if (isActive && timeLeft > 0) {
      interval = setInterval(() => {
        setTimeLeft((prev) => {
          if (prev <= 1) {
            setIsActive(false);
            toast.success("Eksamentid er slut! 🎯");
            handleEndExam();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }

    return () => clearInterval(interval);
  }, [isActive, timeLeft]);

  const handleStartExam = () => {
    if (selectedNotes.length === 0) {
      toast.error("Vælg mindst én note til eksamen");
      return;
    }

    setTimeLeft(examDuration * 60);
    setIsActive(true);
    setShowSetup(false);
    toast.success("Eksamen startet! Held og lykke! 📚");
  };

  const handleEndExam = async () => {
    const studiedMinutes = Math.round((examDuration * 60 - timeLeft) / 60);
    if (studiedMinutes > 0 && user) {
      try {
        await supabase
          .from('progress_logs')
          .insert({
            user_id: user.id,
            minutes: studiedMinutes,
            activity_type: 'exam',
            date: new Date().toISOString().split('T')[0]
          });
      } catch (error) {
        console.error('Error logging study session:', error);
      }
    }

    setIsActive(false);
    setShowSetup(true);
    setSelectedNotes([]);
  };

  const formatTime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    
    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
  };

  const getTimeColor = () => {
    const percentage = (timeLeft / (examDuration * 60)) * 100;
    if (percentage > 50) return "text-green-600";
    if (percentage > 25) return "text-yellow-600";
    return "text-red-600";
  };

  if (!loggedInUser) {
    return <div>Indlæser...</div>;
  }

  if (showSetup) {
    return (
      <div className="max-w-2xl mx-auto space-y-6">
        <div className="text-center">
          <h2 className="text-3xl font-bold text-gray-900 mb-2">📝 Eksamen Mode</h2>
          <p className="text-gray-600">Simuler eksamensbetingelser med tidsbegrænsning</p>
        </div>

        <div className="bg-white rounded-lg shadow-sm border p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Opsætning</h3>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Eksamenslængde (minutter)
              </label>
              <select
                value={examDuration}
                onChange={(e) => setExamDuration(parseInt(e.target.value))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value={30}>30 minutter</option>
                <option value={60}>1 time</option>
                <option value={90}>1,5 timer</option>
                <option value={120}>2 timer</option>
                <option value={180}>3 timer</option>
                <option value={240}>4 timer</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Vælg noter til eksamen ({selectedNotes.length} valgt)
              </label>
              <div className="max-h-60 overflow-y-auto border border-gray-300 rounded-md">
                {notes && notes.length > 0 ? (
                  <div className="divide-y divide-gray-200">
                    {notes.map((note) => (
                      <label key={note._id} className="flex items-center p-3 hover:bg-gray-50 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={selectedNotes.includes(note._id)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedNotes([...selectedNotes, note._id]);
                            } else {
                              setSelectedNotes(selectedNotes.filter(id => id !== note._id));
                            }
                          }}
                          className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                        />
                        <div className="ml-3 flex-1">
                          <div className="font-medium text-gray-900">{note.title}</div>
                          <div className="text-sm text-gray-500">{note.category || 'Ingen kategori'}</div>
                        </div>
                      </label>
                    ))}
                  </div>
                ) : (
                  <div className="p-4 text-center text-gray-500">
                    Ingen noter tilgængelige
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="mt-6 flex justify-center">
            <button
              onClick={handleStartExam}
              disabled={selectedNotes.length === 0}
              className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed font-medium"
            >
              Start eksamen
            </button>
          </div>
        </div>

        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-yellow-800">Eksamen tips</h3>
              <div className="mt-2 text-sm text-yellow-700">
                <ul className="list-disc list-inside space-y-1">
                  <li>Læs alle noter grundigt før du starter</li>
                  <li>Lav noter og sammendrag undervejs</li>
                  <li>Hold øje med tiden og prioriter vigtige emner</li>
                  <li>Tag korte pauser hvis nødvendigt</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Timer Header */}
      <div className="bg-white rounded-lg shadow-sm border p-6">
        <div className="flex justify-between items-center">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">📝 Eksamen i gang</h2>
            <p className="text-gray-600">{selectedNotes.length} noter valgt</p>
          </div>
          
          <div className="text-center">
            <div className={`text-4xl font-mono font-bold ${getTimeColor()}`}>
              {formatTime(timeLeft)}
            </div>
            <div className="text-sm text-gray-500">tid tilbage</div>
          </div>
          
          <button
            onClick={handleEndExam}
            className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
          >
            Afslut eksamen
          </button>
        </div>
        
        {/* Progress Bar */}
        <div className="mt-4">
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div 
              className={`h-2 rounded-full transition-all duration-1000 ${
                timeLeft / (examDuration * 60) > 0.5 ? 'bg-green-600' :
                timeLeft / (examDuration * 60) > 0.25 ? 'bg-yellow-600' : 'bg-red-600'
              }`}
              style={{ width: `${(timeLeft / (examDuration * 60)) * 100}%` }}
            />
          </div>
        </div>
      </div>

      {/* Notes Display */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {notes?.filter(note => selectedNotes.includes(note._id)).map((note) => (
          <ExamNoteCard key={note._id} note={note} />
        ))}
      </div>

      {/* Study Area */}
      <div className="bg-white rounded-lg shadow-sm border p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">📝 Arbejdsområde</h3>
        <textarea
          className="w-full h-64 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
          placeholder="Brug dette område til at tage noter, lave sammendrag eller øve dig..."
        />
        <div className="mt-2 text-xs text-gray-500">
          Dette område gemmes ikke - det er kun til øvelse under eksamen
        </div>
      </div>
    </div>
  );
}

function ExamNoteCard({ note }: { note: any }) {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <div className="bg-white rounded-lg shadow-sm border">
      <div className="p-4 border-b border-gray-200">
        <div className="flex justify-between items-start">
          <div>
            <h3 className="font-semibold text-gray-900">{note.title}</h3>
            {note.category && (
              <span className="inline-block px-2 py-1 text-xs bg-blue-100 text-blue-800 rounded mt-1">
                {note.category}
              </span>
            )}
          </div>
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="text-gray-400 hover:text-gray-600"
          >
            {isExpanded ? '−' : '+'}
          </button>
        </div>
      </div>
      
      {isExpanded && (
        <div className="p-4">
          <div className="prose prose-sm max-w-none">
            <div className="whitespace-pre-wrap text-gray-700">
              {note.content}
            </div>
          </div>
          
          {note.tags && note.tags.length > 0 && (
            <div className="mt-4 flex flex-wrap gap-1">
              {note.tags.map((tag: string, index: number) => (
                <span key={index} className="px-2 py-1 text-xs bg-gray-100 text-gray-600 rounded">
                  #{tag}
                </span>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
