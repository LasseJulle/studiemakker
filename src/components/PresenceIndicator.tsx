import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";

interface PresenceIndicatorProps {
  noteId: string;
}

export default function PresenceIndicator({ noteId }: PresenceIndicatorProps) {
  const presence = useQuery(api.presence.list, { noteId: noteId as any });

  if (!presence || presence.length === 0) {
    return null;
  }

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .substring(0, 2);
  };

  const colors = [
    'bg-blue-500',
    'bg-green-500', 
    'bg-purple-500',
    'bg-pink-500',
    'bg-indigo-500',
    'bg-yellow-500',
  ];

  return (
    <div className="flex items-center space-x-2">
      <div className="flex -space-x-2">
        {presence.slice(0, 3).map((user, index) => (
          <div
            key={user.userId}
            className={`w-8 h-8 rounded-full ${colors[index % colors.length]} flex items-center justify-center text-white text-xs font-medium border-2 border-white`}
            title={`${user.name} er online`}
          >
            {getInitials(user.name)}
          </div>
        ))}
      </div>
      
      {presence.length > 3 && (
        <span className="text-sm text-gray-500">
          +{presence.length - 3} flere
        </span>
      )}
      
      <div className="flex items-center space-x-1 text-sm text-gray-500">
        <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
        <span>
          {presence.length === 1 
            ? `${presence[0].name} er også her`
            : `${presence.length} andre er her`
          }
        </span>
      </div>
    </div>
  );
}
