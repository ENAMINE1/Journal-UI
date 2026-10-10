import { Component, EventEmitter, HostListener, Input, Output, signal } from '@angular/core';
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
import { AccessType, JournalResponse } from './api.service';
import { DraftField } from './models';

@Component({
  selector: 'app-note-editor',
  standalone: true,
  templateUrl: './note-editor.html',
  styleUrl: './note-editor.scss'
})
export class NoteEditorComponent {
  protected readonly slashMenuOpen = signal(false);
  protected readonly slashCommands = [
    { name: 'Heading', hint: 'Large section title', format: 'heading' },
    { name: 'Bullet list', hint: 'A simple list', format: 'bullet' },
    { name: 'Task list', hint: 'A checkable item', format: 'check' },
    { name: 'Quote', hint: 'A highlighted thought', format: 'quote' },
    { name: 'Code block', hint: 'Fenced code', format: 'codeblock' },
    { name: 'Toggle', hint: 'A collapsible section', format: 'details' }
  ];
  @Input() note: JournalResponse | null = null;
  @Input() title = '';
  @Input() content = '';
  @Input() visibility: AccessType = 'PRIVATE';
  @Input() dirty = false;
  @Input() isNew = false;
  @Input() error = '';
  @Output() draftChange = new EventEmitter<{ field: DraftField; value: string }>();
  @Output() save = new EventEmitter<void>();
  @Output() delete = new EventEmitter<void>();

  constructor() {
    hljs.registerLanguage('bash', bash);
    hljs.registerLanguage('cpp', cpp);
    hljs.registerLanguage('java', java);
    hljs.registerLanguage('javascript', javascript);
    hljs.registerLanguage('json', json);
    hljs.registerLanguage('sql', sql);
    hljs.registerLanguage('typescript', typescript);
    hljs.registerLanguage('yaml', yaml);
    hljs.registerLanguage('openapi', yaml);
    marked.use(markedHighlight({
      langPrefix: 'hljs language-',
      highlight: (code, language) => {
        const selectedLanguage = language && hljs.getLanguage(language) ? language : 'plaintext';
        return hljs.highlight(code, { language: selectedLanguage }).value;
      }
    }));
  }

  get renderedContent(): string {
    const source = this.content || '_Start writing to see the rendered note._';
    const detailBlocks: string[] = [];
    const callouts: string[] = [];
    const withoutDetails = source
      .replace(/::: (note|tip|warning|danger)(?:\s+([^\n]+))?\n([\s\S]*?)\n:::/g, (_match, type, title = type, body) => {
        const renderedBody = marked.parse(body) as string;
        callouts.push(`<aside class="callout callout-${type}"><strong>${this.escapeHtml(title)}</strong>${renderedBody}</aside>`);
        return `\n\nCALLOUT_BLOCK_${callouts.length - 1}\n\n`;
      })
      .replace(/::: details(?:\s+([^\n]+))?\n([\s\S]*?)\n:::/g, (_match, title = 'Details', body) => {
      const renderedBody = marked.parse(body) as string;
      detailBlocks.push(`<details><summary>${this.escapeHtml(title)}</summary>${renderedBody}</details>`);
      return `\n\nDETAIL_BLOCK_${detailBlocks.length - 1}\n\n`;
      });
    const rendered = marked.parse(withoutDetails) as string;
    return rendered
      .replace(/<p>DETAIL_BLOCK_(\d+)<\/p>/g, (_match, index) => detailBlocks[Number(index)])
      .replace(/<p>CALLOUT_BLOCK_(\d+)<\/p>/g, (_match, index) => callouts[Number(index)])
      .replace(/<pre><code([\s\S]*?)>([\s\S]*?)<\/code><\/pre>/g, '<div class="code-shell"><button type="button" class="copy-code" data-copy-code aria-label="Copy code">Copy</button><pre><code$1>$2</code></pre></div>');
  }

  get headings(): Array<{ text: string; level: number }> {
    return [...this.content.matchAll(/^(#{1,3})\s+(.+)$/gm)].map((match) => ({ level: match[1].length, text: match[2].trim() }));
  }

  @HostListener('click', ['$event'])
  protected copyCode(event: Event): void {
    const target = event.target as HTMLElement;
    const button = target.closest('[data-copy-code]') as HTMLButtonElement | null;
    if (!button) return;
    const code = button.parentElement?.querySelector('code')?.textContent || '';
    navigator.clipboard.writeText(code).then(() => {
      button.textContent = 'Copied';
      setTimeout(() => button.textContent = 'Copy', 1400);
    });
  }

  formatDate(value: string): string { return new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric', year: 'numeric' }).format(new Date(value)); }

  update(field: DraftField, event: Event): void {
    const value = (event.target as HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement).value;
    if (field === 'content') this.slashMenuOpen.set(/(?:^|\n)\s*\/[^\s]*$/.test(value));
    this.draftChange.emit({ field, value });
  }

  applyMarkdown(format: string, editor: HTMLTextAreaElement): void {
    const start = editor.selectionStart;
    const end = editor.selectionEnd;
    const selected = this.content.slice(start, end) || 'text';
    const snippets: Record<string, string> = {
      bold: `**${selected}**`, italic: `*${selected}*`, heading: `## ${selected}`,
      bullet: `- ${selected}`, quote: `> ${selected}`, code: `\`${selected}\``, check: `- [ ] ${selected}`
      , codeblock: `\n\n\`\`\`\n${selected}\n\`\`\``, details: `\n\n::: details Details\n${selected}\n:::`
    };
    const replacement = snippets[format] || selected;
    this.draftChange.emit({ field: 'content', value: `${this.content.slice(0, start)}${replacement}${this.content.slice(end)}` });
    setTimeout(() => { editor.focus(); editor.setSelectionRange(start + replacement.length, start + replacement.length); });
  }

  applySlashCommand(format: string, editor: HTMLTextAreaElement): void {
    const lineStart = this.content.lastIndexOf('\n') + 1;
    const line = this.content.slice(lineStart);
    const slashIndex = line.lastIndexOf('/');
    const prefix = this.content.slice(0, lineStart + slashIndex);
    const snippets: Record<string, string> = {
      heading: '## ', bullet: '- ', check: '- [ ] ', quote: '> ', codeblock: '```\n\n```', details: '::: details Details\n\n:::'
    };
    this.draftChange.emit({ field: 'content', value: `${prefix}${snippets[format] || ''}` });
    this.slashMenuOpen.set(false);
    setTimeout(() => editor.focus());
  }

  private escapeHtml(value: string): string { return value.replace(/[&<>'"]/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' })[char] || char); }
}
