/**
 * @jest-environment jsdom
 */
// Tests for sanitizeForSpeech function extracted from ChatbotWidget

function sanitizeForSpeech(html) {
  const tmp = document.createElement('div');
  tmp.innerHTML = html;
  tmp.querySelectorAll('a').forEach(a => {
    const text = document.createTextNode(a.textContent);
    a.parentNode.replaceChild(text, a);
  });
  tmp.querySelectorAll('img').forEach(img => img.remove());
  const raw = tmp.textContent || tmp.innerText || '';
  return raw.replace(/\s+/g, ' ').trim();
}

test('keeps link text and removes URLs/images', () => {
  const html = '<p>Go to <a href="https://example.com">Example</a> <img src="pic.png" alt="pic"> now</p>';
  expect(sanitizeForSpeech(html)).toBe('Go to Example now');
});
