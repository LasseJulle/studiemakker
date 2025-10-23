import * as React from 'react';
import { useState, useEffect, useCallback } from 'react';
import { Note, User, NoteCreatePayload, NoteUpdatePayload } from '../../types';
import * as notesApi from '../../lib/api/notesApi';
import PremiumContentGuard from '../guards/PremiumContentGuard';
import NoteEditorModal from '../NoteEditorModal';
import Toast from '../Toast';

const colorVariants = {
    blue: 'bg-blue-100 border-blue-300',
    red: 'bg-red-100 border-red-300',
    green: 'bg-green-100 border-green-300',
    yellow: 'bg-yellow-100 border-yellow-300',
    purple: 'bg-purple-100 border-purple-300',
};

const formatTimeAgo = (dateString?: string): string => {
    if (!dateString) return '';
    const date = new Date(dateString);
    const now = new Date();
    const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);

    let interval = seconds / 31536000;
    if (interval > 1) return `${Math.floor(interval)} år siden`;
    interval = seconds / 2592000;
    if (interval > 1) return `${Math.floor(interval)} mdr. siden`;
    interval = seconds / 86400;
    if (interval > 1) return `${Math.floor(interval)} dage siden`;
    interval = seconds / 3600;
    if (interval > 1) return `${Math.floor(interval)} timer siden`;
    interval = seconds / 60;
    if (interval > 1) return `${Math.floor(interval)} min. siden`;
    return 'Lige nu';
}


const NoteCard: React.FC<{ note: Note; onClick: () => void }> = ({ note, onClick }) => {
    const bgColor = colorVariants[note.color as keyof typeof colorVariants] || 'bg-gray-100 border-gray-300';
    return (
        <button onClick={onClick} className={`text-left p-4 border-l-4 rounded-r-lg shadow-sm transition-transform hover:scale-105 hover:shadow-md w-full ${bgColor}`}>
            <h3 className="text-lg font-semibold text-gray-800 truncate">{note.title}</h3>
            <p className="text-sm font-medium text-gray-600 mt-1">{note.category}</p>
            <p className="text-sm text-gray-500 mt-2 line-clamp-2 h-10">{note.excerpt}</p>
            {note.tags && note.tags.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-1">
                    {note.tags.slice(0, 3).map(tag => (
                        <span key={tag} className="px-2 py-0.5 text-xs bg-gray-200 text-gray-700 rounded-full">{tag}</span>
                    ))}
                </div>
            )}
            <p className="text-xs text-gray-400 mt-3 text-right">Opdateret: {formatTimeAgo(note.updated_at)}</p>
        </button>
    );
};

interface NotesSectionProps {
    user: User;
}

type ToastState = {
  message: string;
  type: 'success' | 'error';
} | null;

const NotesSection: React.FC<NotesSectionProps> = ({ user }) => {
  const [notes, setNotes] = useState<Note[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [noteToEdit, setNoteToEdit] = useState<Note | null>(null);
  const [toast, setToast] = useState<ToastState>(null);

  const fetchNotes = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
        const userNotes = await notesApi.getNotes(user.id);
        setNotes(userNotes);
    } catch (err: any) {
        console.error('Fejl ved hentning af noter:', err);
        setError(err.message || 'Kunne ikke hente dine noter. Prøv venligst igen senere.');
    } finally {
        setIsLoading(false);
    }
  }, [user.id]);

  useEffect(() => {
    fetchNotes();
  }, [fetchNotes]);

  const handleOpenEditorForCreate = () => {
    setNoteToEdit(null);
    setIsModalOpen(true);
  };

  const handleOpenEditorForEdit = (note: Note) => {
    setNoteToEdit(note);
    setIsModalOpen(true);
  };

  const handleSaveNote = async (payload: NoteCreatePayload | NoteUpdatePayload, noteId?: string) => {
    // Edit existing note
    if (noteId) {
        const originalNotes = [...notes];
        const updatedNoteIndex = originalNotes.findIndex(n => n.id === noteId);
        if (updatedNoteIndex === -1) return;

        // Optimistic update
        const updatedNote = { ...originalNotes[updatedNoteIndex], ...payload };
        const newNotes = [...originalNotes];
        newNotes[updatedNoteIndex] = updatedNote as Note;
        setNotes(newNotes);
        
        try {
            const savedNote = await notesApi.updateNote(noteId, payload);
            setNotes(currentNotes => currentNotes.map(n => n.id === noteId ? savedNote : n));
            setToast({ message: 'Noten blev opdateret!', type: 'success' });
        } catch (err: any) {
            setNotes(originalNotes); // Rollback on error
            setToast({ message: `Fejl: ${err.message}`, type: 'error' });
            throw err; // Re-throw to keep modal open and show error
        }
    } 
    // Create new note
    else {
        try {
            const newNote = await notesApi.createNote(user.id, payload as NoteCreatePayload);
            setNotes(prevNotes => [newNote, ...prevNotes]);
            setToast({ message: 'Noten blev oprettet!', type: 'success' });
        } catch(err: any) {
             setToast({ message: `Fejl: ${err.message}`, type: 'error' });
             throw err; // Re-throw to keep modal open and show error
        }
    }
    setIsModalOpen(false);
  };

  const renderContent = () => {
    if (isLoading) {
      return <p className="text-gray-500">Indlæser noter...</p>;
    }
    if (error) {
      return <p className="text-red-500">{error}</p>;
    }
    if (notes.length === 0) {
      return <p className="text-gray-500">Du har ingen noter endnu. Klik på "+ Ny note" for at oprette din første!</p>;
    }
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {notes.map(note => (
            <NoteCard key={note.id} note={note} onClick={() => handleOpenEditorForEdit(note)} />
        ))}
      </div>
    );
  };

  return (
    <div>
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
      <NoteEditorModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} onSave={handleSaveNote} user={user} noteToEdit={noteToEdit} />

      <div className="flex justify-between items-center mb-6">
        <h2 className="text-3xl font-bold text-gray-800">Mine Noter</h2>
        <button 
          onClick={handleOpenEditorForCreate}
          className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
        >
          + Ny note
        </button>
      </div>
      
      {renderContent()}
      
      <div className="mt-8 border-t pt-8">
        <h3 className="text-2xl font-bold text-gray-800 mb-4">Premium Værktøjer</h3>
        <PremiumContentGuard user={user}>
          <div className="flex items-center space-x-4">
            <button className="px-4 py-2 text-sm font-medium text-white bg-green-600 rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500">
              Download Alle Noter
            </button>
            <button className="px-4 py-2 text-sm font-medium text-white bg-purple-600 rounded-md hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500">
              Start en Quiz
            </button>
          </div>
        </PremiumContentGuard>
      </div>
    </div>
  );
};

export default NotesSection;