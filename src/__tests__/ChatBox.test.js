import React from 'react';
import { render, fireEvent } from '@testing-library/react';
import ChatBox from '../ChatBox';

jest.mock('react-markdown', () => {
  const React = require('react');
  const { marked } = require('marked/lib/marked.cjs');
  const createDOMPurify = require('dompurify');
  const DOMPurify = createDOMPurify(globalThis.window);
  return ({ children }) => {
    const html = DOMPurify.sanitize(marked.parse(children), {
      ALLOWED_TAGS: ['b','i','strong','a','img','br','ul','li','p','h1','h2','h3','h4','h5','h6','em','ol','blockquote'],
      ALLOWED_ATTR: ['href','src','alt','title','target']
    });
    return React.createElement('div', { dangerouslySetInnerHTML: { __html: html } });
  };
});

describe('ChatBox', () => {
  beforeEach(() => {
    window.chatHistory = [{ msg: 'Hello' }];
  });

  test('expand/collapse button toggles height classes', () => {
    const { getByRole, container } = render(<ChatBox />);
    const btn = getByRole('button');
    const box = container.querySelector('div.relative');
    expect(box.className).toContain('max-h-72');
    fireEvent.click(btn);
    expect(box.className).toContain('max-h-[80vh]');
    fireEvent.click(btn);
    expect(box.className).toContain('max-h-72');
  });

  test('images render correctly when expanded', () => {
    window.chatHistory = [{ msg: '![alt](http://example.com/img.png)' }];
    const { getByRole, container } = render(<ChatBox />);
    fireEvent.click(getByRole('button'));
    const img = container.querySelector('img');
    expect(img).toBeInTheDocument();
    expect(img.src).toBe('http://example.com/img.png');
  });
});
