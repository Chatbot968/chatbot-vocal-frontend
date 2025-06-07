import htmlToMarkdown from '../htmlToMarkdown';

test('converts HTML links to markdown', () => {
  const html = '<p>Go to <a href="https://example.com">Example</a></p>';
  const md = htmlToMarkdown(html).trim();
  expect(md).toBe('Go to [Example](https://example.com)');
});
