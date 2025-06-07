import React from "react";
import { render } from '@testing-library/react';
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


test('bot markdown renders image and link elements', () => {
  const { container } = render(
    <ChatMessage markdown={'![alt](http://example.com/img.png)\n\n[Example](http://example.com)'} />
  );
  expect(container.querySelector('img')).not.toBeNull();
  const link = container.querySelector('a');
  expect(link).not.toBeNull();
  expect(link.textContent).toBe('Example');
});

test('link receives styling from CSS', () => {
  const style = document.createElement('style');
  style.textContent = '.custom-chatbot-widget a { color: rgb(1, 2, 3); }';
  document.head.appendChild(style);

  const wrapper = document.createElement('div');
  wrapper.className = 'custom-chatbot-widget';
  document.body.appendChild(wrapper);

  const { container } = render(
    <ChatMessage markdown={'[Link](http://example.com)'} />,
    { container: wrapper }
  );

  const link = container.querySelector('a');
  const color = getComputedStyle(link).color;
  expect(color).toBe('rgb(1, 2, 3)');

  document.head.removeChild(style);
  document.body.removeChild(wrapper);
});
