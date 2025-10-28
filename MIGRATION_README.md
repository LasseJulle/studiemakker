# StudyBuddy - Convex to Supabase Migration

## Migration Status: PARTIALLY COMPLETE ⚠️

This project has been **partially migrated** from Convex to Supabase. The core infrastructure is in place, but existing components still need to be updated to work with Supabase instead of Convex.

---

## ✅ What's Been Completed

### 1. Infrastructure Setup
- ✅ Removed Convex dependencies from package.json
- ✅ Added Supabase and React Router dependencies
- ✅ Created Supabase client configuration (`src/lib/supabase.ts`)
- ✅ Set up environment variables (`.env`, `.env.example`)

### 2. Authentication System
- ✅ Created Auth context provider (`src/contexts/AuthContext.tsx`)
- ✅ Built login page with email/password + Google OAuth
- ✅ Built signup page
- ✅ Implemented protected route wrapper

### 3. Navigation & Routing
- ✅ Integrated React Router v6
- ✅ Created sidebar navigation with grouped sections
- ✅ Built AppLayout component with responsive design
- ✅ Created landing page
- ✅ Updated App.tsx with full routing structure

### 4. Custom Hooks
- ✅ Created `useEdgeFunction` hook for calling Supabase Edge Functions
- ✅ Created `usePresence` hook for real-time collaboration

### 5. Database Schema
- ✅ Designed complete PostgreSQL schema (18 tables)
- ✅ Created `supabasedata.txt` with all SQL migrations (copy-paste ready)
- ✅ Includes RLS policies, indexes, triggers, and realtime setup

### 6. Edge Functions
- ✅ Created directory structure (`supabase/functions/`)
- ✅ Implemented `chat-ai` Edge Function example
- ⚠️ Need to create 5 more functions (see below)

---

## ⚠️ What Still Needs To Be Done

### Critical: Component Migration

The following components still use Convex and need to be migrated to Supabase:

1. **`src/components/NotesView.tsx`** - NEEDS MIGRATION
   - Replace `useQuery(api.notes.*)` with Supabase queries
   - Replace `useMutation(api.notes.*)` with Supabase mutations
   - Add Realtime subscriptions for live updates
   - Update CRUD operations

2. **`src/components/AIChat.tsx`** - NEEDS MIGRATION
   - Replace `useAction(api.ai.chatWithAI)` with `useEdgeFunction('chat-ai')`
   - Update response handling

3. **`src/components/StudyDashboard.tsx`** - NEEDS MIGRATION
   - Replace Convex queries with Supabase
   - Fetch from `progress_logs` and `user_stats` tables

4. **`src/components/StudyPlans.tsx`** - NEEDS MIGRATION
   - Replace Convex with Supabase
   - Handle JSONB tasks field

5. **`src/components/FileManager.tsx`** - NEEDS MIGRATION
   - Replace Convex file storage with Supabase Storage
   - Implement upload/download with signed URLs

6. **`src/components/ExamMode.tsx`** - NEEDS MIGRATION
   - Use `generate-exam` Edge Function
   - Update quiz session storage

7. **`src/components/RemindersView.tsx`** - NEEDS MIGRATION
   - Replace Convex with Supabase
   - Add Realtime subscriptions

8. **`src/components/MentorChat.tsx`** (if exists) - NEEDS MIGRATION
   - Use `mentor-chat` Edge Function

### Edge Functions to Create

Create these additional Edge Functions in `supabase/functions/`:

1. **`mentor-chat`** - Note-specific AI mentor
2. **`generate-flashcards`** - Generate flashcards from notes
3. **`generate-quiz`** - Generate quizzes from notes
4. **`generate-exam`** - Generate exam questions
5. **`improve-note`** - AI note improvement suggestions

(Use `chat-ai/index.ts` as a template)

### Files to Delete

Once components are migrated, delete:
- `convex/` directory (entire)
- `src/components/Dashboard.tsx` (replaced by AppLayout + routing)
- Any Convex-specific utility files

---

## 🚀 Setup Instructions

### Prerequisites
- Node.js 18+ installed
- Supabase account (free tier works)
- OpenAI API key for AI features

### Step 1: Install Supabase CLI

```bash
npm install -g supabase
```

### Step 2: Install Dependencies

```bash
cd studiemakker
npm install
```

### Step 3: Set Up Supabase

#### Option A: Use Local Supabase (Recommended for Development)

1. Initialize Supabase:
```bash
supabase init
```

2. Start local Supabase instance:
```bash
supabase start
```

This will output:
- API URL (use for VITE_SUPABASE_URL)
- Anon key (use for VITE_SUPABASE_ANON_KEY)

3. Run database migrations:
```bash
supabase db reset
```

4. Copy SQL from `supabasedata.txt` and paste into Supabase SQL Editor (or create migration file)

#### Option B: Use Hosted Supabase

1. Create project at https://supabase.com
2. Go to Project Settings → API
3. Copy Project URL and anon/public key
4. Update `.env` with your credentials

### Step 4: Configure Environment Variables

Update `.env` with your Supabase credentials:

```env
VITE_SUPABASE_URL=your-supabase-url
VITE_SUPABASE_ANON_KEY=your-anon-key
```

### Step 5: Run Database Migrations

1. Open Supabase Studio SQL Editor
2. Copy all content from `supabasedata.txt`
3. Paste and run the SQL

This creates:
- 18 database tables
- RLS policies
- Indexes and triggers
- Storage bucket
- Realtime configuration

### Step 6: Deploy Edge Functions

```bash
# Deploy the chat-ai function
supabase functions deploy chat-ai

# Set OpenAI API key secret
supabase secrets set OPENAI_API_KEY=your-openai-key
```

### Step 7: Enable Google OAuth (Optional)

1. Go to Supabase Dashboard → Authentication → Providers
2. Enable Google provider
3. Add Google Cloud credentials (Client ID and Secret)
4. Add authorized redirect URLs

### Step 8: Run the App

```bash
npm run dev
```

The app should now open at `http://localhost:5173`

**Note:** Components will show errors until they're migrated from Convex to Supabase!

---

## 📖 Migration Guide for Components

### Pattern 1: Replace Queries

**Before (Convex):**
```typescript
import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";

const notes = useQuery(api.notes.list, { userId: user.id });
```

**After (Supabase):**
```typescript
import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

const { user } = useAuth();
const [notes, setNotes] = useState([]);

useEffect(() => {
  const fetchNotes = async () => {
    const { data, error } = await supabase
      .from('notes')
      .select('*')
      .eq('user_id', user.id)
      .order('updated_at', { ascending: false });

    if (error) throw error;
    setNotes(data || []);
  };

  if (user) fetchNotes();
}, [user]);
```

### Pattern 2: Replace Mutations

**Before (Convex):**
```typescript
import { useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";

const createNote = useMutation(api.notes.create);
await createNote({ title, content });
```

**After (Supabase):**
```typescript
const createNote = async (title: string, content: string) => {
  const { data, error } = await supabase
    .from('notes')
    .insert({ title, content, user_id: user.id })
    .select()
    .single();

  if (error) throw error;
  return data;
};
```

### Pattern 3: Replace Actions (AI calls)

**Before (Convex):**
```typescript
import { useAction } from "convex/react";
import { api } from "../../convex/_generated/api";

const chatWithAI = useAction(api.ai.chatWithAI);
const response = await chatWithAI({ prompt });
```

**After (Supabase Edge Functions):**
```typescript
import { useEdgeFunction } from '../hooks/useEdgeFunction';

const chatWithAI = useEdgeFunction<{ prompt: string }, { response: string }>('chat-ai');
const { response } = await chatWithAI({ prompt });
```

### Pattern 4: Add Realtime Subscriptions

```typescript
import { useEffect } from 'react';
import { supabase } from '../lib/supabase';

useEffect(() => {
  const channel = supabase
    .channel('notes-channel')
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'notes',
        filter: `user_id=eq.${user.id}`
      },
      (payload) => {
        if (payload.eventType === 'INSERT') {
          setNotes(prev => [payload.new, ...prev]);
        } else if (payload.eventType === 'UPDATE') {
          setNotes(prev => prev.map(note =>
            note.id === payload.new.id ? payload.new : note
          ));
        } else if (payload.eventType === 'DELETE') {
          setNotes(prev => prev.filter(note => note.id !== payload.old.id));
        }
      }
    )
    .subscribe();

  return () => {
    channel.unsubscribe();
  };
}, [user]);
```

---

## 🐛 Troubleshooting

### App won't start
- Run `npm install` to install new dependencies
- Check `.env` file has valid Supabase credentials
- Make sure Supabase is running (if using local): `supabase status`

### Components showing errors
- This is expected! Components need to be migrated from Convex to Supabase
- Follow the migration patterns above
- Start with NotesView.tsx as it's the most critical

### Database connection errors
- Verify VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in `.env`
- Check Supabase is running: `supabase status`
- Verify SQL migrations were run successfully

### Auth not working
- Make sure `supabasedata.txt` SQL was run (creates profiles table and trigger)
- Check browser console for errors
- Verify RLS policies are enabled

### Edge Functions failing
- Deploy functions: `supabase functions deploy chat-ai`
- Set OpenAI API key: `supabase secrets set OPENAI_API_KEY=your-key`
- Check function logs: `supabase functions logs chat-ai`

---

## 📚 Additional Resources

- [Supabase Documentation](https://supabase.com/docs)
- [React Router Documentation](https://reactrouter.com/)
- [Migration Planning Document](planning.md) - Full technical specification
- [Supabase SQL Reference](https://supabase.com/docs/guides/database)
- [Edge Functions Guide](https://supabase.com/docs/guides/functions)

---

## 🎯 Next Steps

1. **Run database migrations** - Copy SQL from `supabasedata.txt` into Supabase
2. **Start with NotesView** - This is the most important component
3. **Migrate AIChat** - Second priority for AI functionality
4. **Test authentication** - Sign up and login should already work
5. **Migrate remaining components** one by one
6. **Create remaining Edge Functions** using chat-ai as template
7. **Delete Convex files** once everything works
8. **Test thoroughly** before deploying to production

---

## 📝 Notes

- The sidebar navigation is fully functional
- Authentication with email/password and Google OAuth is ready
- Database schema is complete and production-ready
- Routing structure is finalized
- Components will compile but won't function until migrated from Convex

**Estimated time to complete migration:** 4-8 hours depending on experience with Supabase

For questions or help, refer to `planning.md` for the complete technical specification.
