import {marked} from 'marked';

function sanitizeForSpeech(html) {
  const tmp = document.createElement('div');
  tmp.innerHTML = html;
  tmp.querySelectorAll('a').forEach(a => a.replaceWith(a.textContent));
  tmp.querySelectorAll('img').forEach(img => img.remove());
  return tmp.textContent || tmp.innerText || '';
}

test('sanitizeForSpeech keeps link text and strips URLs', () => {
  const input = 'Hello <a href="https://example.com">world</a>!';
  const out = sanitizeForSpeech(input);
  expect(out).toBe('Hello world!');
  expect(out).not.toMatch(/https:\/\/example.com/);
});

function renderBotMessage(markdown) {
  const container = document.createElement('div');
  container.innerHTML = marked.parse(markdown);
  container.querySelectorAll('a').forEach(anchor => {
    const btn = document.createElement('button');
    btn.textContent = anchor.textContent;
    btn.dataset.url = anchor.getAttribute('href');
    anchor.replaceWith(btn);
  });
  return container;
}

test('bot messages convert markdown links to buttons', () => {
  const wrapper = renderBotMessage('Click [here](https://example.com)');
  const button = wrapper.querySelector('button');
  expect(button).toBeTruthy();
  expect(button).toHaveTextContent('here');
  expect(button.dataset.url).toBe('https://example.com');
  expect(wrapper.querySelector('a')).toBeNull();
});
