import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation, useAction } from "convex/react";
import { api } from "../../convex/_generated/api";
import { formatTimeAgo } from "../lib/utils";
import { toast } from "sonner";
import FileManager from "./FileManager";
import MentorChat from "./MentorChat";

export default function NotesView() {
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [editingNote, setEditingNote] = useState<any>(null);
  const [showSearch, setShowSearch] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchFilters, setSearchFilters] = useState({
    tags: [] as string[],
    subject: "",
    dateFrom: "",
    dateTo: "",
    sort: "updated" as "updated" | "created" | "title",
  });
  const [showVersionHistory, setShowVersionHistory] = useState<string | null>(null);

  const loggedInUser = useQuery(api.auth.loggedInUser);
  const notes = useQuery(
    api.notes.getNotesByUser,
    loggedInUser ? { userId: loggedInUser._id } : "skip"
  );
  const searchResults = useQuery(
    api.notes.search,
    loggedInUser && (searchQuery || searchFilters.tags.length > 0 || searchFilters.subject || searchFilters.dateFrom || searchFilters.dateTo)
      ? {
          userId: loggedInUser._id,
          q: searchQuery || undefined,
          tags: searchFilters.tags.length > 0 ? searchFilters.tags : undefined,
          subject: searchFilters.subject || undefined,
          dateFrom: searchFilters.dateFrom ? new Date(searchFilters.dateFrom).getTime() : undefined,
          dateTo: searchFilters.dateTo ? new Date(searchFilters.dateTo).getTime() : undefined,
          sort: searchFilters.sort,
        }
      : "skip"
  );
  const sharedNotes = useQuery(api.notes.getSharedNotes);
  const subjects = useQuery(api.notes.getSubjects);

  const createNote = useMutation(api.notes.createNote);
  const updateNote = useMutation(api.notes.updateNote);
  const deleteNote = useMutation(api.notes.deleteNote);
  const importFromText = useAction(api.notes.importFromText);

  const displayNotes = searchResults || notes || [];

  const handleCreateNote = async (noteData: any) => {
    if (!loggedInUser) return;
    
    try {
      await createNote({
        userId: loggedInUser._id,
        ...noteData,
      });
      setShowCreateForm(false);
      toast.success("Note oprettet!");
    } catch (error) {
      toast.error("Kunne ikke oprette note");
    }
  };

  const handleUpdateNote = async (noteData: any) => {
    if (!editingNote) return;
    
    try {
      await updateNote({
        noteId: editingNote._id,
        ...noteData,
      });
      setEditingNote(null);
      toast.success("Note opdateret!");
    } catch (error) {
      toast.error("Kunne ikke opdatere note");
    }
  };

  const handleDeleteNote = async (noteId: any) => {
    if (!confirm("Er du sikker på, at du vil slette denne note?")) return;
    
    try {
      await deleteNote({ noteId });
      toast.success("Note slettet!");
    } catch (error) {
      toast.error("Kunne ikke slette note");
    }
  };

  const handleImport = async (file: File) => {
    try {
      const content = await file.text();
      const result = await importFromText({
        content,
        filename: file.name,
      });
      toast.success(`Note "${result.title}" importeret!`);
    } catch (error) {
      toast.error("Kunne ikke importere fil");
    }
  };

  const handleAddTag = (tag: string) => {
    if (!searchFilters.tags.includes(tag)) {
      setSearchFilters({
        ...searchFilters,
        tags: [...searchFilters.tags, tag],
      });
    }
  };

  const handleRemoveTag = (tag: string) => {
    setSearchFilters({
      ...searchFilters,
      tags: searchFilters.tags.filter(t => t !== tag),
    });
  };

  if (!loggedInUser) {
    return <div>Indlæser...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-bold text-gray-900">Noter</h2>
          <p className="text-gray-600">Organiser og administrer dine studienoter</p>
        </div>
        <div className="flex space-x-3">
          <ImportButton onImport={handleImport} />
          <button
            onClick={() => setShowSearch(!showSearch)}
            className="bg-gray-600 text-white px-4 py-2 rounded-lg hover:bg-gray-700 transition-colors"
          >
            🔍 Søg
          </button>
          <button
            onClick={() => setShowCreateForm(true)}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
          >
            Opret Note
          </button>
        </div>
      </div>

      {/* Advanced Search */}
      {showSearch && (
        <SearchPanel
          query={searchQuery}
          onQueryChange={setSearchQuery}
          filters={searchFilters}
          onFiltersChange={setSearchFilters}
          subjects={subjects || []}
          onAddTag={handleAddTag}
          onRemoveTag={handleRemoveTag}
        />
      )}

      {/* Shared Notes Section */}
      {sharedNotes && sharedNotes.length > 0 && (
        <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
          <h3 className="text-lg font-semibold text-blue-900 mb-3">📤 Delte noter</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {sharedNotes.map((note) => (
              <div key={note._id} className="bg-white rounded-lg shadow-sm border p-4">
                <div className="flex items-center space-x-2 mb-2">
                  <h4 className="font-medium text-gray-900">{note.title}</h4>
                  <span className="px-2 py-1 text-xs bg-blue-100 text-blue-800 rounded">
                    Delt
                  </span>
                </div>
                <p className="text-sm text-gray-600 truncate">
                  {note.content.substring(0, 80)}...
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Create/Edit Form */}
      {(showCreateForm || editingNote) && (
        <NoteForm
          note={editingNote}
          onSubmit={editingNote ? handleUpdateNote : handleCreateNote}
          onCancel={() => {
            setShowCreateForm(false);
            setEditingNote(null);
          }}
          onShowVersionHistory={setShowVersionHistory}
        />
      )}

      {/* Version History Modal */}
      {showVersionHistory && (
        <VersionHistoryModal
          noteId={showVersionHistory}
          onClose={() => setShowVersionHistory(null)}
        />
      )}

      {/* Notes List */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {displayNotes && displayNotes.length > 0 ? (
          displayNotes.map((note) => (
            <NoteCard
              key={note._id}
              note={note}
              onEdit={setEditingNote}
              onDelete={handleDeleteNote}
              onShowVersionHistory={setShowVersionHistory}
            />
          ))
        ) : (
          <div className="col-span-full text-center py-12">
            <svg className="w-16 h-16 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              {searchQuery || searchFilters.tags.length > 0 ? "Ingen resultater" : "Ingen noter endnu"}
            </h3>
            <p className="text-gray-600 mb-4">
              {searchQuery || searchFilters.tags.length > 0 
                ? "Prøv at justere dine søgekriterier"
                : "Opret din første note for at komme i gang med at studere!"
              }
            </p>
            {!searchQuery && searchFilters.tags.length === 0 && (
              <button
                onClick={() => setShowCreateForm(true)}
                className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
              >
                Opret Din Første Note
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function SearchPanel({ query, onQueryChange, filters, onFiltersChange, subjects, onAddTag, onRemoveTag }: any) {
  const [tagInput, setTagInput] = useState("");

  const handleAddTag = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && tagInput.trim()) {
      onAddTag(tagInput.trim());
      setTagInput("");
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">🔍 Avanceret søgning</h3>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Søg i titel og indhold</label>
          <input
            type="text"
            value={query}
            onChange={(e) => onQueryChange(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Søg efter noter..."
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Fag</label>
          <select
            value={filters.subject}
            onChange={(e) => onFiltersChange({ ...filters, subject: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">Alle fag</option>
            {subjects.map((subject: string) => (
              <option key={subject} value={subject}>{subject}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Sorter efter</label>
          <select
            value={filters.sort}
            onChange={(e) => onFiltersChange({ ...filters, sort: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="updated">Senest opdateret</option>
            <option value="created">Senest oprettet</option>
            <option value="title">Titel A-Z</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Fra dato</label>
          <input
            type="date"
            value={filters.dateFrom}
            onChange={(e) => onFiltersChange({ ...filters, dateFrom: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Til dato</label>
          <input
            type="date"
            value={filters.dateTo}
            onChange={(e) => onFiltersChange({ ...filters, dateTo: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Tilføj tag</label>
          <input
            type="text"
            value={tagInput}
            onChange={(e) => setTagInput(e.target.value)}
            onKeyDown={handleAddTag}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Tryk Enter for at tilføje"
          />
        </div>
      </div>

      {/* Selected Tags */}
      {filters.tags.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {filters.tags.map((tag: string) => (
            <span
              key={tag}
              className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm flex items-center space-x-1"
            >
              <span>#{tag}</span>
              <button
                onClick={() => onRemoveTag(tag)}
                className="text-blue-600 hover:text-blue-800"
              >
                ×
              </button>
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

function ImportButton({ onImport }: { onImport: (file: File) => void }) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      onImport(file);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  return (
    <>
      <input
        ref={fileInputRef}
        type="file"
        accept=".md,.txt,.docx"
        onChange={handleFileChange}
        className="hidden"
      />
      <button
        onClick={() => fileInputRef.current?.click()}
        className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors"
      >
        📥 Import
      </button>
    </>
  );
}

function NoteCard({ note, onEdit, onDelete, onShowVersionHistory }: any) {
  const exportNote = useQuery(
    api.notes.exportNote,
    { noteId: note._id, format: "markdown" }
  );

  const handleExport = (format: "markdown" | "text") => {
    if (!exportNote) return;
    
    const blob = new Blob([exportNote.content], { type: exportNote.mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = exportNote.filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border p-6">
      <div className="flex justify-between items-start mb-4">
        <div className="flex items-center space-x-2">
          <h3 className="font-semibold text-gray-900 text-lg">{note.title}</h3>
          {note.grade && (
            <span className="px-2 py-1 text-xs bg-yellow-100 text-yellow-800 rounded font-medium">
              {note.grade}/10
            </span>
          )}
          {note.sharedWith && note.sharedWith.length > 0 && (
            <span className="px-2 py-1 text-xs bg-green-100 text-green-800 rounded">
              Delt
            </span>
          )}
        </div>
        <div className="flex space-x-2">
          <button
            onClick={() => onShowVersionHistory(note._id)}
            className="text-gray-400 hover:text-purple-600"
            title="Versionshistorik"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </button>
          <button
            onClick={() => handleExport("markdown")}
            className="text-gray-400 hover:text-green-600"
            title="Eksporter"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </button>
          <button
            onClick={() => onEdit(note)}
            className="text-gray-400 hover:text-blue-600"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
          </button>
          <button
            onClick={() => onDelete(note._id)}
            className="text-gray-400 hover:text-red-600"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          </button>
        </div>
      </div>
      
      <p className="text-gray-600 text-sm mb-4 line-clamp-3">
        {note.content.length > 150 
          ? `${note.content.substring(0, 150)}...` 
          : note.content}
      </p>
      
      {note.feedback && (
        <div className="mb-4 p-2 bg-purple-50 rounded text-xs text-purple-800">
          <strong>Feedback:</strong> {note.feedback.length > 80 ? `${note.feedback.substring(0, 80)}...` : note.feedback}
        </div>
      )}
      
      <div className="flex justify-between items-center">
        {note.category && (
          <span className="px-2 py-1 text-xs bg-blue-100 text-blue-800 rounded">
            {note.category}
          </span>
        )}
        <span className="text-xs text-gray-500">
          {formatTimeAgo(note.updatedAt)}
        </span>
      </div>
      
      {note.tags && note.tags.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-1">
          {note.tags.map((tag: string, index: number) => (
            <span key={index} className="px-2 py-1 text-xs bg-gray-100 text-gray-700 rounded">
              #{tag}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

function NoteForm({ note, onSubmit, onCancel, onShowVersionHistory }: any) {
  const [formData, setFormData] = useState({
    title: note?.title || "",
    content: note?.content || "",
    category: note?.category || "",
    tags: note?.tags?.join(", ") || "",
    color: note?.color || "#3B82F6",
  });
  const [aiResult, setAiResult] = useState<any>(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [showImprovement, setShowImprovement] = useState(false);
  const [improvement, setImprovement] = useState<any>(null);
  const [showShareModal, setShowShareModal] = useState(false);

  const summarizeNote = useAction(api.aiActions.summarizeNote);
  const quizFromNote = useAction(api.aiActions.quizFromNote);
  const improveNote = useAction(api.mentor.improveNote);
  const shareNote = useMutation(api.notes.shareNote);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const noteData = {
      title: formData.title,
      content: formData.content,
      category: formData.category || undefined,
      tags: formData.tags ? formData.tags.split(",").map((tag: string) => tag.trim()).filter(Boolean) : undefined,
      color: formData.color,
    };
    
    await onSubmit(noteData);
  };

  const handleImproveNote = async () => {
    if (!note?._id) {
      toast.error("Gem noten først");
      return;
    }

    setAiLoading(true);
    
    try {
      const result = await improveNote({ noteId: note._id });
      setImprovement(result);
      setShowImprovement(true);
    } catch (error) {
      toast.error("Kunne ikke forbedre noten");
    } finally {
      setAiLoading(false);
    }
  };

  const handleAcceptImprovement = () => {
    if (improvement) {
      setFormData({ ...formData, content: improvement.improvedText });
      setShowImprovement(false);
      setImprovement(null);
      toast.success("Note forbedret!");
    }
  };

  const handleShareNote = async (email: string) => {
    if (!note?._id) {
      toast.error("Gem noten først");
      return;
    }

    try {
      await shareNote({ noteId: note._id, toEmail: email });
      toast.success(`Note delt med ${email}`);
      setShowShareModal(false);
    } catch (error) {
      toast.error("Kunne ikke dele noten");
    }
  };

  const handleAISummarize = async () => {
    if (!note?._id || !formData.content.trim()) {
      toast.error("Gem noten først eller tilføj indhold");
      return;
    }

    setAiLoading(true);
    
    try {
      const summary = await summarizeNote({ noteId: note._id });
      setAiResult({ type: 'summary', content: summary });
    } catch (error) {
      toast.error("Kunne ikke generere sammendrag");
    } finally {
      setAiLoading(false);
    }
  };

  const handleAIQuiz = async () => {
    if (!note?._id || !formData.content.trim()) {
      toast.error("Gem noten først eller tilføj indhold");
      return;
    }

    setAiLoading(true);
    
    try {
      const quiz = await quizFromNote({ noteId: note._id });
      setAiResult({ type: 'quiz', content: quiz });
    } catch (error) {
      toast.error("Kunne ikke generere quiz");
    } finally {
      setAiLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border p-6">
      <div className="flex justify-between items-center mb-6">
        <h3 className="text-xl font-semibold text-gray-900">
          {note ? "Rediger Note" : "Opret Ny Note"}
        </h3>
        <div className="flex space-x-2">
          {note && (
            <>
              <button
                onClick={() => setShowShareModal(true)}
                className="px-3 py-1 text-sm bg-green-600 text-white rounded hover:bg-green-700"
              >
                📤 Del note
              </button>
              <button
                onClick={handleImproveNote}
                disabled={aiLoading}
                className="px-3 py-1 text-sm bg-purple-600 text-white rounded hover:bg-purple-700 disabled:opacity-50"
              >
                {aiLoading ? "⏳" : "🪄"} Forbedr note
              </button>
              <button
                onClick={() => onShowVersionHistory(note._id)}
                className="px-3 py-1 text-sm bg-gray-600 text-white rounded hover:bg-gray-700"
              >
                📜 Historik
              </button>
            </>
          )}
          <button
            onClick={onCancel}
            className="px-3 py-1 text-sm bg-gray-500 text-white rounded hover:bg-gray-600"
          >
            Annuller
          </button>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Titel</label>
            <input
              type="text"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Kategori/Fag</label>
            <input
              type="text"
              value={formData.category}
              onChange={(e) => setFormData({ ...formData, category: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="f.eks. Matematik, Historie"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Tags (kommasepareret)</label>
          <input
            type="text"
            value={formData.tags}
            onChange={(e) => setFormData({ ...formData, tags: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="f.eks. eksamen, vigtig, gennemgang"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Indhold</label>
          <textarea
            value={formData.content}
            onChange={(e) => setFormData({ ...formData, content: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            rows={12}
            required
          />
        </div>

        <div className="flex justify-between items-center">
          <div className="flex space-x-2">
            {note && (
              <>
                <button
                  type="button"
                  onClick={handleAISummarize}
                  disabled={aiLoading}
                  className="px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
                >
                  {aiLoading ? "⏳" : "📝"} Sammendrag
                </button>
                <button
                  type="button"
                  onClick={handleAIQuiz}
                  disabled={aiLoading}
                  className="px-3 py-1 text-sm bg-indigo-600 text-white rounded hover:bg-indigo-700 disabled:opacity-50"
                >
                  {aiLoading ? "⏳" : "❓"} Quiz
                </button>
              </>
            )}
          </div>
          <button
            type="submit"
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            {note ? "Opdater Note" : "Opret Note"}
          </button>
        </div>
      </form>

      {/* AI Result Display */}
      {aiResult && (
        <div className="mt-6 p-4 bg-gray-50 rounded-lg">
          <h4 className="font-medium text-gray-900 mb-2">
            {aiResult.type === 'summary' ? '📝 AI Sammendrag' : '❓ AI Quiz'}
          </h4>
          <div className="text-sm text-gray-700 whitespace-pre-wrap">
            {typeof aiResult.content === 'string' 
              ? aiResult.content 
              : JSON.stringify(aiResult.content, null, 2)
            }
          </div>
        </div>
      )}

      {/* Improvement Modal */}
      {showImprovement && improvement && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-4xl w-full max-h-[80vh] overflow-y-auto">
            <div className="p-6">
              <h3 className="text-xl font-semibold text-gray-900 mb-4">🪄 Forbedret Note</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                <div>
                  <h4 className="font-medium text-gray-700 mb-2">Original</h4>
                  <div className="p-3 bg-gray-50 rounded border text-sm max-h-60 overflow-y-auto">
                    {formData.content}
                  </div>
                </div>
                <div>
                  <h4 className="font-medium text-gray-700 mb-2">Forbedret</h4>
                  <div className="p-3 bg-green-50 rounded border text-sm max-h-60 overflow-y-auto">
                    {improvement.improvedText}
                  </div>
                </div>
              </div>

              <div className="mb-6">
                <h4 className="font-medium text-gray-700 mb-2">Ændringer</h4>
                <p className="text-sm text-gray-600">{improvement.summary}</p>
              </div>

              <div className="flex justify-end space-x-3">
                <button
                  onClick={() => setShowImprovement(false)}
                  className="px-4 py-2 text-gray-600 border border-gray-300 rounded hover:bg-gray-50"
                >
                  Annuller
                </button>
                <button
                  onClick={handleAcceptImprovement}
                  className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
                >
                  Accepter forbedringer
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Share Modal */}
      {showShareModal && (
        <ShareModal
          onShare={handleShareNote}
          onClose={() => setShowShareModal(false)}
        />
      )}
    </div>
  );
}

function ShareModal({ onShare, onClose }: { onShare: (email: string) => void; onClose: () => void }) {
  const [email, setEmail] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (email.trim()) {
      onShare(email.trim());
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg max-w-md w-full p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">📤 Del Note</h3>
        
        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Email adresse
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="bruger@example.com"
              required
            />
          </div>
          
          <div className="flex justify-end space-x-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-gray-600 border border-gray-300 rounded hover:bg-gray-50"
            >
              Annuller
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
            >
              Del note
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function VersionHistoryModal({ noteId, onClose }: { noteId: string; onClose: () => void }) {
  const versions = useQuery(api.notes.getVersions, { noteId: noteId as any });
  const restoreVersion = useMutation(api.notes.restoreVersion);

  const handleRestore = async (versionId: string) => {
    if (!confirm("Er du sikker på, at du vil gendanne denne version?")) return;
    
    try {
      await restoreVersion({ noteId: noteId as any, versionId: versionId as any });
      toast.success("Version gendannet!");
      onClose();
    } catch (error) {
      toast.error("Kunne ikke gendanne version");
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg max-w-4xl w-full max-h-[80vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-xl font-semibold text-gray-900">📜 Versionshistorik</h3>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <div className="space-y-4">
            {versions && versions.length > 0 ? (
              versions.map((version, index) => (
                <div key={version._id} className="border rounded-lg p-4">
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <h4 className="font-medium text-gray-900">{version.title}</h4>
                      <p className="text-sm text-gray-500">
                        {formatTimeAgo(version.createdAt)}
                        {index === 0 && " (Nuværende)"}
                      </p>
                    </div>
                    {index > 0 && (
                      <button
                        onClick={() => handleRestore(version._id)}
                        className="px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700"
                      >
                        Gendan
                      </button>
                    )}
                  </div>
                  <p className="text-sm text-gray-600 line-clamp-3">
                    {version.content.substring(0, 200)}...
                  </p>
                </div>
              ))
            ) : (
              <p className="text-gray-500 text-center py-8">Ingen versionshistorik tilgængelig</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
