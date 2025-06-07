import React from 'react';
import "./ChatMessage.css";
import ReactMarkdown from 'react-markdown';

function ChatMessage({ markdown }) {
  return (
    <ReactMarkdown
      components={{
        a: ({ node, ...props }) => (
          <a {...props} target="_blank" rel="noopener noreferrer" />
        ),
        img: ({ node, ...props }) => <img {...props} alt={props.alt || ''} />,
      }}
    >
      {markdown}
    </ReactMarkdown>
  );
}

export default ChatMessage;
