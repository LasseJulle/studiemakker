import { useState, useRef, useEffect } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { toast } from "sonner";
import { formatTimeAgo } from "../lib/utils";

interface CommentsPanelProps {
  noteId: string;
  isOpen: boolean;
  onClose: () => void;
  selectedText?: {
    text: string;
    start: number;
    end: number;
  };
}

export default function CommentsPanel({ noteId, isOpen, onClose, selectedText }: CommentsPanelProps) {
  const [newComment, setNewComment] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const comments = useQuery(api.comments.list, { noteId: noteId as any });
  const addComment = useMutation(api.comments.add);
  const resolveComment = useMutation(api.comments.resolve);
  const deleteComment = useMutation(api.comments.deleteComment);

  useEffect(() => {
    if (isOpen && selectedText) {
      setNewComment(`Angående: "${selectedText.text}"\n\n`);
      textareaRef.current?.focus();
    }
  }, [isOpen, selectedText]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim()) return;

    setIsSubmitting(true);
    try {
      await addComment({
        noteId: noteId as any,
        text: newComment.trim(),
        selectionStart: selectedText?.start,
        selectionEnd: selectedText?.end,
        selectionText: selectedText?.text,
      });
      setNewComment("");
      toast.success("Kommentar tilføjet");
    } catch (error: any) {
      toast.error(error.message || "Kunne ikke tilføje kommentar");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResolve = async (commentId: string) => {
    try {
      await resolveComment({ commentId: commentId as any });
      toast.success("Kommentar markeret som løst");
    } catch (error: any) {
      toast.error(error.message || "Kunne ikke løse kommentar");
    }
  };

  const handleDelete = async (commentId: string) => {
    if (!confirm("Slet denne kommentar?")) return;

    try {
      await deleteComment({ commentId: commentId as any });
      toast.success("Kommentar slettet");
    } catch (error: any) {
      toast.error(error.message || "Kunne ikke slette kommentar");
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed right-0 top-0 h-full w-80 bg-white border-l border-gray-200 shadow-lg z-40 overflow-y-auto">
      <div className="p-4">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold text-gray-900">💬 Kommentarer</h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Add Comment Form */}
        <form onSubmit={handleSubmit} className="mb-6">
          {selectedText && (
            <div className="mb-2 p-2 bg-blue-50 rounded text-sm">
              <strong>Markeret tekst:</strong> "{selectedText.text}"
            </div>
          )}
          <textarea
            ref={textareaRef}
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            rows={3}
            placeholder="Skriv en kommentar..."
            required
          />
          <button
            type="submit"
            disabled={isSubmitting || !newComment.trim()}
            className="mt-2 w-full px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
          >
            {isSubmitting ? "Tilføjer..." : "Tilføj kommentar"}
          </button>
        </form>

        {/* Comments List */}
        <div className="space-y-4">
          {comments && comments.length > 0 ? (
            comments.map((comment) => (
              <div
                key={comment._id}
                className={`p-3 rounded-lg border ${
                  comment.resolved ? "bg-gray-50 border-gray-200" : "bg-white border-gray-300"
                }`}
              >
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <div className="font-medium text-sm text-gray-900">
                      {comment.authorName}
                    </div>
                    <div className="text-xs text-gray-500">
                      {formatTimeAgo(comment.createdAt)}
                    </div>
                  </div>
                  <div className="flex space-x-1">
                    {!comment.resolved && (
                      <button
                        onClick={() => handleResolve(comment._id)}
                        className="text-green-600 hover:text-green-800 text-xs"
                        title="Marker som løst"
                      >
                        ✓
                      </button>
                    )}
                    <button
                      onClick={() => handleDelete(comment._id)}
                      className="text-red-600 hover:text-red-800 text-xs"
                      title="Slet"
                    >
                      ×
                    </button>
                  </div>
                </div>

                {comment.selectionText && (
                  <div className="mb-2 p-2 bg-blue-50 rounded text-xs">
                    <strong>Ref:</strong> "{comment.selectionText}"
                  </div>
                )}

                <p className="text-sm text-gray-700 whitespace-pre-wrap">
                  {comment.text}
                </p>

                {comment.resolved && (
                  <div className="mt-2 text-xs text-green-600 font-medium">
                    ✓ Løst
                  </div>
                )}
              </div>
            ))
          ) : (
            <div className="text-center py-8 text-gray-500">
              <svg className="w-12 h-12 mx-auto mb-2 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
              <p>Ingen kommentarer endnu</p>
              <p className="text-xs">Marker tekst og tilføj en kommentar</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
