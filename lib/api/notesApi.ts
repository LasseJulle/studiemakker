import { supabase } from '../supabase/client';
import { Note, NoteCreatePayload, NoteUpdatePayload } from '../../types';

/**
 * Helper function to extract a meaningful error message from any caught value.
 */
const getErrorMessage = (error: unknown): string => {
    if (error && typeof error === 'object' && 'message' in error) {
        return String((error as { message: unknown }).message);
    }
    return 'En ukendt databasefejl opstod.';
};

/**
 * Fetches all notes for a given user.
 * @param userId The ID of the user whose notes to fetch.
 * @returns A promise that resolves to an array of notes.
 */
export const getNotes = async (userId: string): Promise<Note[]> => {
    const { data, error } = await supabase
        .from('notes')
        .select('*')
        .eq('user_id', userId)
        .order('updated_at', { ascending: false });

    if (error) {
        console.error('API Error (getNotes):', error);
        throw new Error(getErrorMessage(error));
    }
    return data || [];
};

/**
 * Creates a new note.
 * @param userId The ID of the user creating the note.
 * @param payload The data for the new note.
 * @returns A promise that resolves to the newly created note.
 */
export const createNote = async (userId: string, payload: NoteCreatePayload): Promise<Note> => {
    const { data, error } = await supabase
        .from('notes')
        .insert({ ...payload, user_id: userId })
        .select()
        .single();
    
    if (error) {
        console.error('API Error (createNote):', error);
        throw new Error(getErrorMessage(error));
    }

    // Log progress via RPC
    const { error: rpcError } = await supabase.rpc('increment_notes_created');
    if (rpcError) {
        // Non-critical error, just log it
        console.warn('API Warning (increment_notes_created):', rpcError.message);
    }

    return data;
};

/**
 * Updates an existing note.
 * @param noteId The ID of the note to update.
 * @param payload The data to update.
 * @returns A promise that resolves to the updated note.
 */
export const updateNote = async (noteId: string, payload: NoteUpdatePayload): Promise<Note> => {
    const { data, error } = await supabase
        .from('notes')
        .update(payload)
        .eq('id', noteId)
        .select()
        .single();
    
    if (error) {
        console.error('API Error (updateNote):', error);
        throw new Error(getErrorMessage(error));
    }

    return data;
};