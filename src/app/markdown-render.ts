import { marked } from 'marked';
import { markedHighlight } from 'marked-highlight';
import hljs from 'highlight.js/lib/core';
import bash from 'highlight.js/lib/languages/bash';
import cpp from 'highlight.js/lib/languages/cpp';
import java from 'highlight.js/lib/languages/java';
import javascript from 'highlight.js/lib/languages/javascript';
import json from 'highlight.js/lib/languages/json';
import sql from 'highlight.js/lib/languages/sql';
import typescript from 'highlight.js/lib/languages/typescript';
import yaml from 'highlight.js/lib/languages/yaml';

let markdownConfigured = false;

/** Configure marked + highlight.js once. Idempotent, safe to call from any component. */
export function configureMarkdown(): void {
  if (markdownConfigured) return;
  markdownConfigured = true;
  const languages: Array<[string, Parameters<typeof hljs.registerLanguage>[1]]> = [
    ['bash', bash], ['cpp', cpp], ['java', java], ['javascript', javascript],
    ['json', json], ['sql', sql], ['typescript', typescript], ['yaml', yaml], ['openapi', yaml]
  ];
  for (const [name, language] of languages) {
    if (!hljs.getLanguage(name)) hljs.registerLanguage(name, language);
  }
  marked.use(markedHighlight({
    langPrefix: 'hljs language-',
    highlight: (code, language) => {
      const selectedLanguage = language && hljs.getLanguage(language) ? language : 'plaintext';
      return hljs.highlight(code, { language: selectedLanguage }).value;
    }
  }));
}

export function escapeHtml(value: string): string {
  return value.replace(/[&<>'"]/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' })[char] || char);
}

/** Transform ::: callouts/details blocks, parse Markdown, and wrap code blocks in copyable shells. */
function renderToHtml(source: string): string {
  const detailBlocks: string[] = [];
  const callouts: string[] = [];
  const withoutCustomBlocks = source
    .replace(/::: (note|tip|warning|danger)(?:\s+([^\n]+))?\n([\s\S]*?)\n:::/g, (_match, type, title = type, body) => {
      const renderedBody = marked.parse(body) as string;
      callouts.push(`<aside class="callout callout-${type}"><strong>${escapeHtml(title)}</strong>${renderedBody}</aside>`);
      return `\n\nCALLOUT_BLOCK_${callouts.length - 1}\n\n`;
    })
    .replace(/::: details(?:\s+([^\n]+))?\n([\s\S]*?)\n:::/g, (_match, title = 'Details', body) => {
      const renderedBody = marked.parse(body) as string;
      detailBlocks.push(`<details><summary>${escapeHtml(title)}</summary>${renderedBody}</details>`);
      return `\n\nDETAIL_BLOCK_${detailBlocks.length - 1}\n\n`;
    });
  return (marked.parse(withoutCustomBlocks) as string)
    .replace(/<p>DETAIL_BLOCK_(\d+)<\/p>/g, (_match, index) => detailBlocks[Number(index)])
    .replace(/<p>CALLOUT_BLOCK_(\d+)<\/p>/g, (_match, index) => callouts[Number(index)])
    .replace(/<pre><code([\s\S]*?)>([\s\S]*?)<\/code><\/pre>/g, '<div class="code-shell"><pre><code$1>$2</code></pre></div>');
}

/** Render one Markdown block for a CodeMirror live-preview widget. Injected outside Angular's
 *  sanitizer, so it gets a minimal hardening pass (scripts, event handlers, javascript: URLs). */
export function renderMarkdownBlock(text: string): string {
  return sanitizeHtml(renderToHtml(text));
}

/** Render a whole document for the reading view (Angular sanitizes the [innerHTML] binding). */
export function renderDocument(source: string): string {
  return renderToHtml(source);
}

/** Minimal hardening for HTML injected outside Angular's sanitizer (editor widgets). */
function sanitizeHtml(html: string): string {
  const template = document.createElement('template');
  template.innerHTML = html;
  template.content.querySelectorAll('script, style, iframe, object, embed, form, link, meta').forEach((element) => element.remove());
  template.content.querySelectorAll('*').forEach((element) => {
    for (const attribute of Array.from(element.attributes)) {
      const name = attribute.name.toLowerCase();
      const value = attribute.value.trim().toLowerCase();
      if (name.startsWith('on') || ((name === 'href' || name === 'src' || name === 'xlink:href') && value.startsWith('javascript:'))) {
        element.removeAttribute(attribute.name);
      }
    }
  });
  return template.innerHTML;
}

/** Add copy buttons + language labels to rendered code shells. Idempotent per shell. */
export function enhanceRenderedMarkdown(root: HTMLElement): void {
  for (const shell of Array.from(root.querySelectorAll<HTMLElement>('.code-shell'))) {
    if (shell.querySelector('.copy-code')) continue;
    const code = shell.querySelector('code');
    if (!code) continue;
    const language = /language-([\w+#-]+)/.exec(code.className)?.[1];
    if (language) shell.setAttribute('data-lang', language);
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'copy-code';
    button.textContent = 'Copy';
    button.setAttribute('aria-label', 'Copy code to clipboard');
    button.addEventListener('click', () => {
      navigator.clipboard.writeText(code.textContent || '').then(() => {
        button.textContent = 'Copied';
        button.classList.add('copied');
        setTimeout(() => { button.textContent = 'Copy'; button.classList.remove('copied'); }, 1400);
      });
    });
    shell.appendChild(button);
  }
}
