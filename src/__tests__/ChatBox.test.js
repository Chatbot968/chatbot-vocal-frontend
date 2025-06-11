import React, {useState} from 'react';
import {render, fireEvent} from '@testing-library/react';
import ChatMessage from '../ChatMessage';

jest.mock('react-markdown', () => {
  const React = require('react');
  const { marked } = require('marked/lib/marked.cjs');
  const createDOMPurify = require('dompurify');
  const DOMPurify = createDOMPurify(globalThis.window);
  return ({ children, markdown }) => {
    const md = markdown || children;
    const html = DOMPurify.sanitize(marked.parse(md), {
      ALLOWED_TAGS: ['b','i','strong','a','img','br','ul','li','p','h1','h2','h3','h4','h5','h6','em','ol','blockquote'],
      ALLOWED_ATTR: ['href','src','alt','title','target']
    });
    return React.createElement('div', { dangerouslySetInnerHTML: { __html: html } });
  };
});

function ChatBox({markdown}) {
  const [expanded, setExpanded] = useState(false);
  return (
    <div>
      <button data-testid="toggle" onClick={() => setExpanded(e=>!e)}>
        {expanded ? 'Reduce' : 'Expand'}
      </button>
      <div data-testid="chat-log" className={expanded ? 'expanded' : 'collapsed'}>
        <ChatMessage markdown={markdown} />
      </div>
    </div>
  );
}

test('expand/collapse button toggles height classes', () => {
  const {getByTestId} = render(<ChatBox markdown="Hello" />);
  const toggle = getByTestId('toggle');
  const chatLog = getByTestId('chat-log');
  expect(chatLog.className).toContain('collapsed');
  fireEvent.click(toggle);
  expect(chatLog.className).toContain('expanded');
  fireEvent.click(toggle);
  expect(chatLog.className).toContain('collapsed');
});

test('images render correctly when expanded', () => {
  const md = '![alt](http://example.com/img.png)';
  const {getByTestId} = render(<ChatBox markdown={md} />);
  fireEvent.click(getByTestId('toggle'));
  const img = getByTestId('chat-log').querySelector('img');
  expect(img).toBeInTheDocument();
  expect(img.src).toBe('http://example.com/img.png');
});
