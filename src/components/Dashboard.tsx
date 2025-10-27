import { useState } from "react";
import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { SignOutButton } from "../SignOutButton";
import NotesView from "./NotesView";
import AIChat from "./AIChat";
import FileManager from "./FileManager";
import StudyPlans from "./StudyPlans";
import StudyDashboard from "./StudyDashboard";
import ExamMode from "./ExamMode";
import { formatTimeAgo } from "../lib/utils";

export default function Dashboard() {
  const [activeTab, setActiveTab] = useState<"dashboard" | "notes" | "plans" | "ai" | "files" | "exam">("dashboard");
  const loggedInUser = useQuery(api.auth.loggedInUser);

  if (!loggedInUser) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-400"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900">
      {/* Header */}
      <header className="bg-gray-800 shadow-sm border-b border-gray-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-8">
              <h1 className="text-2xl font-bold text-blue-400">StudyBuddy</h1>
              <nav className="flex space-x-4">
                <button
                  onClick={() => setActiveTab("dashboard")}
                  className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                    activeTab === "dashboard"
                      ? "bg-blue-600 text-white"
                      : "text-gray-300 hover:text-white hover:bg-gray-700"
                  }`}
                >
                  Dashboard
                </button>
                <button
                  onClick={() => setActiveTab("notes")}
                  className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                    activeTab === "notes"
                      ? "bg-blue-600 text-white"
                      : "text-gray-300 hover:text-white hover:bg-gray-700"
                  }`}
                >
                  Noter
                </button>
                <button
                  onClick={() => setActiveTab("plans")}
                  className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                    activeTab === "plans"
                      ? "bg-blue-600 text-white"
                      : "text-gray-300 hover:text-white hover:bg-gray-700"
                  }`}
                >
                  Studieplaner
                </button>
                <button
                  onClick={() => setActiveTab("exam")}
                  className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                    activeTab === "exam"
                      ? "bg-blue-600 text-white"
                      : "text-gray-300 hover:text-white hover:bg-gray-700"
                  }`}
                >
                  🎯 Eksamen
                </button>
                <button
                  onClick={() => setActiveTab("files")}
                  className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                    activeTab === "files"
                      ? "bg-blue-600 text-white"
                      : "text-gray-300 hover:text-white hover:bg-gray-700"
                  }`}
                >
                  Filer
                </button>
                <button
                  onClick={() => setActiveTab("ai")}
                  className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                    activeTab === "ai"
                      ? "bg-blue-600 text-white"
                      : "text-gray-300 hover:text-white hover:bg-gray-700"
                  }`}
                >
                  AI Mentor
                </button>
              </nav>
            </div>
            <div className="flex items-center space-x-4">
              <span className="text-sm text-gray-300">
                Velkommen, {loggedInUser.email}
              </span>
              <SignOutButton />
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main>
        {activeTab === "dashboard" && <StudyDashboard />}
        {activeTab === "notes" && <div className="bg-gray-50"><NotesView /></div>}
        {activeTab === "plans" && <div className="bg-gray-50"><StudyPlans /></div>}
        {activeTab === "exam" && <ExamMode />}
        {activeTab === "files" && <div className="bg-gray-50"><FilesView /></div>}
        {activeTab === "ai" && <div className="bg-gray-50"><AIChat /></div>}
      </main>
    </div>
  );
}

function FilesView() {
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      <div>
        <h2 className="text-3xl font-bold text-gray-900">Filer</h2>
        <p className="text-gray-600">Administrer alle dine uploadede filer</p>
      </div>
      
      <div className="bg-white rounded-lg shadow-sm border p-6">
        <FileManager />
      </div>
    </div>
  );
}
