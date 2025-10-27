import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { toast } from "sonner";

interface ShareModalProps {
  noteId: string;
  onClose: () => void;
}

export default function ShareModal({ noteId, onClose }: ShareModalProps) {
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<"editor" | "viewer">("viewer");
  const [isLoading, setIsLoading] = useState(false);

  const shares = useQuery(api.sharing.list, { noteId: noteId as any });
  const inviteUser = useMutation(api.sharing.invite);
  const updateRole = useMutation(api.sharing.updateRole);
  const revokeAccess = useMutation(api.sharing.revoke);

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;

    setIsLoading(true);
    try {
      await inviteUser({
        noteId: noteId as any,
        targetEmail: email.trim(),
        role,
      });
      toast.success(`Note delt med ${email}`);
      setEmail("");
    } catch (error: any) {
      toast.error(error.message || "Kunne ikke dele note");
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpdateRole = async (shareId: string, newRole: "editor" | "viewer") => {
    try {
      await updateRole({ shareId: shareId as any, role: newRole });
      toast.success("Rolle opdateret");
    } catch (error: any) {
      toast.error(error.message || "Kunne ikke opdatere rolle");
    }
  };

  const handleRevoke = async (shareId: string, email: string) => {
    if (!confirm(`Fjern adgang for ${email}?`)) return;

    try {
      await revokeAccess({ shareId: shareId as any });
      toast.success("Adgang fjernet");
    } catch (error: any) {
      toast.error(error.message || "Kunne ikke fjerne adgang");
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg max-w-md w-full p-6 max-h-[80vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold text-gray-900">📤 Del Note</h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Invite Form */}
        <form onSubmit={handleInvite} className="mb-6">
          <div className="mb-3">
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
          
          <div className="mb-3">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Rolle
            </label>
            <select
              value={role}
              onChange={(e) => setRole(e.target.value as "editor" | "viewer")}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="viewer">Læser (kan kun se)</option>
              <option value="editor">Redaktør (kan redigere)</option>
            </select>
          </div>
          
          <button
            type="submit"
            disabled={isLoading}
            className="w-full px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
          >
            {isLoading ? "Deler..." : "Del note"}
          </button>
        </form>

        {/* Current Shares */}
        {shares && shares.length > 0 && (
          <div>
            <h4 className="font-medium text-gray-900 mb-3">Delt med:</h4>
            <div className="space-y-2">
              {shares.map((share) => (
                <div key={share._id} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                  <div>
                    <div className="font-medium text-sm">{share.name || share.email}</div>
                    <div className="text-xs text-gray-500">{share.email}</div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <select
                      value={share.role}
                      onChange={(e) => handleUpdateRole(share._id, e.target.value as "editor" | "viewer")}
                      className="text-xs px-2 py-1 border border-gray-300 rounded"
                    >
                      <option value="viewer">Læser</option>
                      <option value="editor">Redaktør</option>
                    </select>
                    <button
                      onClick={() => handleRevoke(share._id, share.email)}
                      className="text-red-600 hover:text-red-800 text-xs"
                    >
                      Fjern
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
