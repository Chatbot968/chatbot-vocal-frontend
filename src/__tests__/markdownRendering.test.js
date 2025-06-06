import { marked } from 'marked';
import createDOMPurify from 'dompurify';

const DOMPurify = createDOMPurify(window);

function renderMarkdownMessage(md) {
  const container = document.createElement('div');
  const html = DOMPurify.sanitize(marked.parse(md), {
    ALLOWED_TAGS: ['b', 'i', 'strong', 'a', 'img', 'br', 'ul', 'li', 'p'],
    ALLOWED_ATTR: ['href', 'src', 'alt', 'title', 'target'],
  });
  container.innerHTML = html;
  return container;
}

test('bot markdown renders image and link elements', () => {
  const md = '![alt](http://example.com/img.png)\\n\\n[Example](http://example.com)';
  const el = renderMarkdownMessage(md);
  expect(el.querySelector('img')).not.toBeNull();
  const link = el.querySelector('a');
  expect(link).not.toBeNull();
  expect(link.textContent).toBe('Example');
});

test('link receives styling from CSS', () => {
  const style = document.createElement('style');
  style.textContent = '.custom-chatbot-widget a { color: rgb(1, 2, 3); }';
  document.head.appendChild(style);

  const md = '[Link](http://example.com)';
  const wrapper = document.createElement('div');
  wrapper.className = 'custom-chatbot-widget';
  const el = renderMarkdownMessage(md);
  wrapper.appendChild(el);
  document.body.appendChild(wrapper);

  const link = wrapper.querySelector('a');
  const color = getComputedStyle(link).color;
  expect(color).toBe('rgb(1, 2, 3)');

  document.head.removeChild(style);
  document.body.removeChild(wrapper);
});
