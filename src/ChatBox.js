import React, { useEffect, useState } from "react";
import ReactMarkdown from "react-markdown";

export default function ChatBox() {
  const [expanded, setExpanded] = useState(false);
  const [messages, setMessages] = useState(() => window.chatHistory || []);

  useEffect(() => {
    function handleUpdate() {
      setMessages([...window.chatHistory]);
    }
    window.addEventListener("chatHistoryUpdate", handleUpdate);
    return () => window.removeEventListener("chatHistoryUpdate", handleUpdate);
  }, []);

  return (
    <div className="flex flex-col w-full items-center">
      <div
        className={`relative transition-all duration-300 bg-white rounded-2xl shadow p-4 mb-2 w-full max-w-lg ${
          expanded ? "max-h-[80vh]" : "max-h-72"
        } overflow-y-auto`}
        style={{ minHeight: 120 }}
      >
        {/* Bouton en haut à droite */}
        <button
          onClick={() => setExpanded((e) => !e)}
          className="absolute top-3 right-4 bg-gray-100 hover:bg-gray-200 transition px-3 py-1 rounded-xl text-xs shadow font-medium z-10"
        >
          {expanded ? "Réduire" : "Agrandir"}
        </button>

        {/* Contenu du chat */}
        {messages.map((msg, idx) => (
          <div key={idx} className="mb-2">
            <ReactMarkdown
              components={{
                img: ({ node, ...props }) => (
                  <img
                    {...props}
                    className="my-2 rounded-xl mx-auto max-h-72 object-contain"
                    alt={props.alt}
                  />
                ),
              }}
            >
              {msg.content || msg.msg}
            </ReactMarkdown>
          </div>
        ))}
      </div>
    </div>
  );
}
