import * as React from 'react';
import { useState, useRef, useEffect } from 'react';
import { ChatMessage, User } from '../../types';
import { generateAiResponse } from '../../services/geminiService';
import PremiumContentGuard from '../guards/PremiumContentGuard';

interface AIChatSectionProps {
  user: User;
}

const AIChatSection: React.FC<AIChatSectionProps> = ({ user }) => {
  const [messages, setMessages] = useState<ChatMessage[]>([
    { sender: 'ai', text: 'Hej! Jeg er din AI-studieassistent. Stil mig et spørgsmål om dine noter, eller bed mig om at forklare et komplekst emne.' },
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<null | HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    const userMessage: ChatMessage = { sender: 'user', text: input };
    const history = [...messages];
    const currentInput = input;

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
        const aiResponseText = await generateAiResponse(history, currentInput);
        setMessages(prev => [...prev, { sender: 'ai', text: aiResponseText }]);
    } catch (error) {
        console.error("AI chat error:", error);
        setMessages(prev => [...prev, { sender: 'ai', text: 'Beklager, der skete en fejl. Prøv venligst igen.' }]);
    } finally {
        setIsLoading(false);
    }
  };

  return (
    <div>
      <h2 className="text-3xl font-bold text-gray-800 mb-6">AI-hjælp</h2>
      <PremiumContentGuard user={user}>
        <div className="bg-white shadow-lg rounded-lg flex flex-col h-[65vh]">
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {messages.map((msg, index) => (
              <div key={index} className={`flex items-end gap-2 ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
                 {msg.sender === 'ai' && (
                    <div className="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center text-white text-sm font-bold flex-shrink-0" aria-label="AI assistant">
                        AI
                    </div>
                )}
                <div className={`max-w-xs lg:max-w-md px-4 py-3 rounded-2xl ${msg.sender === 'user' ? 'bg-blue-600 text-white rounded-br-none' : 'bg-gray-200 text-gray-800 rounded-bl-none'}`}>
                  <p className="text-sm whitespace-pre-wrap">{msg.text}</p>
                </div>
              </div>
            ))}
             <div ref={messagesEndRef} />
          </div>
          <form onSubmit={handleSendMessage} className="p-4 border-t flex items-center bg-gray-50 rounded-b-lg">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Skriv dit spørgsmål her..."
              className="flex-grow px-4 py-2 border border-gray-300 rounded-full focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
              disabled={isLoading}
              aria-label="Chat input"
            />
            <button
              type="submit"
              disabled={isLoading || !input.trim()}
              className="ml-3 flex-shrink-0 w-10 h-10 flex items-center justify-center text-white bg-blue-600 rounded-full hover:bg-blue-700 disabled:bg-blue-300 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
              aria-label={isLoading ? "Sender besked" : "Send besked"}
            >
              {isLoading ? (
                <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" role="status" aria-live="polite">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
              ) : (
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                    <path d="M10.894 2.553a1 1 0 00-1.788 0l-7 14a1 1 0 001.169 1.409l5-1.429A1 1 0 009 15.571V11a1 1 0 112 0v4.571a1 1 0 00.725.962l5 1.428a1 1 0 001.17-1.408l-7-14z" />
                </svg>
              )}
            </button>
          </form>
        </div>
      </PremiumContentGuard>
    </div>
  );
};

export default AIChatSection;