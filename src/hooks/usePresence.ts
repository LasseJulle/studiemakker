import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { RealtimeChannel } from '@supabase/supabase-js'
import { useAuth } from '../contexts/AuthContext'

interface PresenceState {
  noteId: string
  userId: string
  cursor: number | null
  selectionStart: number | null
  selectionEnd: number | null
  userName: string
}

export function usePresence(noteId: string) {
  const { user } = useAuth()
  const [presences, setPresences] = useState<PresenceState[]>([])

  useEffect(() => {
    if (!noteId || !user) return

    let channel: RealtimeChannel

    const setupPresence = async () => {
      // Subscribe to presence changes
      channel = supabase
        .channel(`presence-${noteId}`)
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'presence',
            filter: `note_id=eq.${noteId}`,
          },
          async (payload) => {
            // Fetch user profile for display
            if (payload.new && payload.new.user_id) {
              const { data: profile } = await supabase
                .from('profiles')
                .select('name')
                .eq('id', payload.new.user_id)
                .single()

              const presence: PresenceState = {
                noteId: payload.new.note_id,
                userId: payload.new.user_id,
                cursor: payload.new.cursor,
                selectionStart: payload.new.selection_start,
                selectionEnd: payload.new.selection_end,
                userName: profile?.name || 'Anonymous',
              }

              if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
                setPresences((prev) => {
                  const filtered = prev.filter((p) => p.userId !== presence.userId)
                  return [...filtered, presence]
                })
              }
            }

            if (payload.eventType === 'DELETE' && payload.old && payload.old.user_id) {
              setPresences((prev) => prev.filter((p) => p.userId !== payload.old.user_id))
            }
          }
        )
        .subscribe()
    }

    setupPresence()

    return () => {
      if (channel) {
        channel.unsubscribe()
      }
    }
  }, [noteId, user])

  // Update presence
  const updatePresence = async (cursor: number, selectionStart?: number, selectionEnd?: number) => {
    if (!user) return

    await supabase.from('presence').upsert(
      {
        note_id: noteId,
        user_id: user.id,
        cursor,
        selection_start: selectionStart || null,
        selection_end: selectionEnd || null,
        last_seen: new Date().toISOString(),
      },
      {
        onConflict: 'note_id,user_id',
      }
    )
  }

  return { presences, updatePresence }
}
