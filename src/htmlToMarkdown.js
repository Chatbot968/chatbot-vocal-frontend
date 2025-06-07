import TurndownService from 'turndown';

const turndownService = new TurndownService();

export default function htmlToMarkdown(html) {
  return turndownService.turndown(html);
}
