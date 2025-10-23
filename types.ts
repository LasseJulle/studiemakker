export interface User {
  id: string;
  email?: string; // Email kan være udefineret
  display_name: string | null;
  is_premium: boolean;
}

export interface Note {
  id: string;
  user_id: string;
  title: string;
  category: string;
  excerpt: string;
  content?: string;
  color: string;
  tags?: string[];
  created_at?: string;
  updated_at?: string;
}

export type NoteCreatePayload = Omit<Note, 'id' | 'user_id' | 'created_at' | 'updated_at'>;
export type NoteUpdatePayload = Partial<NoteCreatePayload>;


export interface Category {
  id: string;
  user_id: string;
  name: string;
}

export interface ChatMessage {
  sender: 'user' | 'ai';
  text: string;
}

export enum DashboardView {
  Notes = 'noter',
  AIChat = 'ai-chat',
  Progress = 'progression'
}

export interface ProgressLog {
  id: string;
  user_id: string;
  date: string; // Format: 'YYYY-MM-DD'
  minutes: number;
  notes_created: number;
  quizzes_done: number;
  created_at?: string;
}