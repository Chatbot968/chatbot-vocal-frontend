import React, { useEffect, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import './ChatMessage.css';

function ChatBox() {
  const [expanded, setExpanded] = useState(false);
  const [messages, setMessages] = useState(() => window.chatHistory || []);

  useEffect(() => {
    function handleUpdate() {
      setMessages([...window.chatHistory]);
    }
    window.addEventListener('chatHistoryUpdate', handleUpdate);
    return () => window.removeEventListener('chatHistoryUpdate', handleUpdate);
  }, []);

  return (
    <div
      className={`relative bg-white rounded-lg p-3 overflow-y-auto transition-all ${expanded ? 'max-h-[75vh]' : 'max-h-40'}`}
    >
      <button
        className="absolute top-1 right-1 text-xl"
        onClick={() => setExpanded(!expanded)}
        aria-label={expanded ? 'Réduire' : 'Agrandir'}
      >
        {expanded ? '🗕' : '🗖'}
      </button>
      {messages.map((m, idx) => (
        <div key={idx} className={`flex my-2 ${m.sender === 'user' ? 'justify-end' : ''}`}> 
          <div className={`${m.sender === 'user' ? 'bg-blue-100' : 'bg-gray-100'} rounded-xl p-2 max-w-[85%]`}>
            <ReactMarkdown>{m.msg}</ReactMarkdown>
          </div>
        </div>
      ))}
    </div>
  );
}

export default ChatBox;
