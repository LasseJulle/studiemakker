import * as React from 'react';
import { useState, useEffect, useCallback } from 'react';
import { Note, User, Category, NoteCreatePayload, NoteUpdatePayload } from '../types';
import { supabase } from '../lib/supabase/client';

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
    return 'Der opstod en uventet fejl.';
};

interface NoteEditorModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (payload: NoteCreatePayload | NoteUpdatePayload, noteId?: string) => Promise<void>;
  user: User;
  noteToEdit?: Note | null;
}

const colorOptions = [
    { name: 'blue', hex: '#3b82f6' },
    { name: 'red', hex: '#ef4444' },
    { name: 'green', hex: '#22c55e' },
    { name: 'yellow', hex: '#eab308' },
    { name: 'purple', hex: '#8b5cf6' },
];

const predefinedCategories = ["Matematik", "Dansk", "Virksomhedsøkonomi"];
const CREATE_NEW_CATEGORY_VALUE = "__CREATE_NEW__";

const NoteEditorModal: React.FC<NoteEditorModalProps> = ({ isOpen, onClose, onSave, user, noteToEdit }) => {
  const isEditMode = !!noteToEdit;
  
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [tagsInput, setTagsInput] = useState('');
  const [color, setColor] = useState('blue');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const [categories, setCategories] = useState<string[]>(predefinedCategories);
  const [selectedCategory, setSelectedCategory] = useState(predefinedCategories[0]);
  const [newCategoryName, setNewCategoryName] = useState('');
  
  const resetForm = useCallback(() => {
    setTitle('');
    setContent('');
    setTagsInput('');
    setColor('blue');
    setSelectedCategory(categories[0] || '');
    setNewCategoryName('');
    setIsLoading(false);
    setError('');
  }, [categories]);

  const populateForm = useCallback((note: Note) => {
    setTitle(note.title);
    setContent(note.content || '');
    setTagsInput(note.tags?.join(', ') || '');
    setColor(note.color || 'blue');
    
    if (note.category && !categories.includes(note.category)) {
        setCategories(prev => [...prev, note.category]);
    }
    setSelectedCategory(note.category || categories[0] || '');
  }, [categories]);

  useEffect(() => {
    if (isOpen) {
        if (isEditMode) {
            populateForm(noteToEdit);
        } else {
            resetForm();
        }
    }
  }, [isOpen, isEditMode, noteToEdit, resetForm, populateForm]);


  const fetchCategories = useCallback(async () => {
    if (!user) return;
    const { data, error: fetchError } = await supabase
      .from('categories')
      .select('name')
      .eq('user_id', user.id);
    
    if (fetchError) {
      console.warn("Supabase error fetching categories:", fetchError.message);
    } else {
      const userCategories = data.map(c => c.name);
      const allCategories = [...new Set([...predefinedCategories, ...userCategories])];
      setCategories(allCategories);
    }
  }, [user]);
  
  useEffect(() => {
    if (isOpen) {
        fetchCategories();
    }
  }, [isOpen, fetchCategories]);

  const handleSave = useCallback(async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!title.trim()) {
        setError('Titel er påkrævet.');
        return;
    }
    
    let finalCategoryName = selectedCategory;

    if (selectedCategory === CREATE_NEW_CATEGORY_VALUE) {
        if (!newCategoryName.trim()) {
            setError('Navn på ny kategori er påkrævet.');
            return;
        }
        finalCategoryName = newCategoryName.trim();
    }
    
    if (!finalCategoryName) {
        setError('Du skal vælge eller oprette en kategori.');
        return;
    }

    setError('');
    setIsLoading(true);

    try {
        if (selectedCategory === CREATE_NEW_CATEGORY_VALUE && !categories.includes(finalCategoryName)) {
            const { error: insertCatError } = await supabase
                .from('categories')
                .insert({ name: finalCategoryName, user_id: user.id });
            
            if (insertCatError && insertCatError.code !== '23505') { // 23505 is unique_violation
                throw insertCatError;
            }
        }

        const tags = tagsInput.split(',').map(tag => tag.trim()).filter(Boolean);
        const excerpt = content.trim().substring(0, 100) + (content.trim().length > 100 ? '...' : '');

        const payload: NoteCreatePayload | NoteUpdatePayload = { title, category: finalCategoryName, content, tags, color, excerpt };
        
        await onSave(payload, noteToEdit?.id);
        
    } catch (err: unknown) {
        const errorMessage = getErrorMessage(err);
        setError(`Kunne ikke gemme note: ${errorMessage}`);
    } finally {
        setIsLoading(false);
    }
  }, [title, content, tagsInput, color, selectedCategory, newCategoryName, categories, onSave, noteToEdit, user.id]);

  // Keyboard shortcut (Cmd/Ctrl + S)
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key === 's') {
        event.preventDefault();
        handleSave();
      }
    };
    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, handleSave]);


  if (!isOpen) {
    return null;
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 z-40 flex justify-center items-center p-4" aria-modal="true" role="dialog">
      <div className="bg-gray-50 rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] flex flex-col animate-fade-in-down">
        <div className="p-6 border-b border-gray-200">
            <div className="flex justify-between items-center">
                <h2 className="text-2xl font-bold text-gray-800">{isEditMode ? 'Redigér Note' : 'Opret Ny Note'}</h2>
                <button type="button" onClick={onClose} className="text-gray-400 hover:text-gray-600 p-1 rounded-full hover:bg-gray-200 transition-colors" aria-label="Luk modal">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                </button>
            </div>
        </div>
        
        <form onSubmit={handleSave} className="flex-1 flex flex-col overflow-hidden">
            <div className="flex-1 overflow-y-auto p-6">
                
                {error && <p className="text-red-600 text-sm mb-4 bg-red-100 p-3 rounded-md border border-red-300">{error}</p>}

                <div className="space-y-6">
                    <div>
                        <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-1">Titel</label>
                        <input type="text" id="title" value={title} onChange={e => setTitle(e.target.value)} required className="block w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent sm:text-sm" />
                    </div>
                     <div>
                        <label htmlFor="category" className="block text-sm font-medium text-gray-700 mb-1">Kategori</label>
                        <select id="category" value={selectedCategory} onChange={e => setSelectedCategory(e.target.value)} className="block w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent sm:text-sm">
                            {categories.map(cat => <option key={cat} value={cat}>{cat}</option>)}
                            <option value={CREATE_NEW_CATEGORY_VALUE}>Opret ny kategori...</option>
                        </select>
                    </div>

                    {selectedCategory === CREATE_NEW_CATEGORY_VALUE && (
                         <div className="pl-4 border-l-2 border-blue-500 animate-fade-in-down">
                            <label htmlFor="new-category" className="block text-sm font-medium text-gray-700 mb-1">Navn på ny kategori</label>
                            <input type="text" id="new-category" value={newCategoryName} onChange={e => setNewCategoryName(e.target.value)} placeholder="f.eks. Biologi" className="block w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent sm:text-sm" />
                        </div>
                    )}
                    
                    <div>
                        <label htmlFor="content" className="block text-sm font-medium text-gray-700 mb-1">Indhold</label>
                        <textarea id="content" value={content} onChange={e => setContent(e.target.value)} rows={8} className="block w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent sm:text-sm"></textarea>
                    </div>
                    <div>
                        <label htmlFor="tags" className="block text-sm font-medium text-gray-700 mb-1">Tags (adskil med komma)</label>
                        <input type="text" id="tags" value={tagsInput} onChange={e => setTagsInput(e.target.value)} placeholder="f.eks. integralregning, romantikken" className="block w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent sm:text-sm" />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700">Farve</label>
                        <div className="mt-2 flex space-x-3">
                            {colorOptions.map(opt => (
                                <button type="button" key={opt.name} onClick={() => setColor(opt.name)} className={`w-8 h-8 rounded-full border-2 transition-transform transform hover:scale-110 ${color === opt.name ? 'ring-2 ring-blue-500 ring-offset-2' : 'border-gray-300 hover:border-gray-400'}`} style={{ backgroundColor: opt.hex }} aria-label={`Vælg farve ${opt.name}`}></button>
                            ))}
                        </div>
                    </div>
                </div>
            </div>

            <div className="bg-gray-100 px-6 py-4 flex justify-end space-x-3 border-t border-gray-200 mt-auto">
                <button type="button" onClick={onClose} disabled={isLoading} className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 transition-colors">
                    Annuller
                </button>
                <button type="submit" disabled={isLoading} className="px-5 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-wait transition-colors">
                    {isLoading ? 'Gemmer...' : 'Gem Note'}
                </button>
            </div>
        </form>
      </div>
    </div>
  );
};

export default NoteEditorModal;