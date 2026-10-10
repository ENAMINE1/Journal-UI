import { Component, EventEmitter, Input, Output } from '@angular/core';
import { marked } from 'marked';
import { AccessType, JournalResponse } from './api.service';
import { DraftField } from './models';

@Component({
  selector: 'app-note-editor',
  standalone: true,
  templateUrl: './note-editor.html',
  styleUrl: './note-editor.scss'
})
export class NoteEditorComponent {
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

  get renderedContent(): string {
    return marked.parse(this.content || '_Start writing to see the rendered note._') as string;
  }

  formatDate(value: string): string { return new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric', year: 'numeric' }).format(new Date(value)); }

  update(field: DraftField, event: Event): void {
    this.draftChange.emit({ field, value: (event.target as HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement).value });
  }

  applyMarkdown(format: string, editor: HTMLTextAreaElement): void {
    const start = editor.selectionStart;
    const end = editor.selectionEnd;
    const selected = this.content.slice(start, end) || 'text';
    const snippets: Record<string, string> = {
      bold: `**${selected}**`, italic: `*${selected}*`, heading: `## ${selected}`,
      bullet: `- ${selected}`, quote: `> ${selected}`, code: `\`${selected}\``, check: `- [ ] ${selected}`
    };
    const replacement = snippets[format] || selected;
    this.draftChange.emit({ field: 'content', value: `${this.content.slice(0, start)}${replacement}${this.content.slice(end)}` });
    setTimeout(() => { editor.focus(); editor.setSelectionRange(start + replacement.length, start + replacement.length); });
  }
}
