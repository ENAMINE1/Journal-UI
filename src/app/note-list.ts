import { Component, EventEmitter, Input, Output } from '@angular/core';
import { JournalResponse } from './api.service';
import { NoteFilter } from './models';

@Component({
  selector: 'app-note-list',
  standalone: true,
  templateUrl: './note-list.html',
  styleUrl: './note-list.scss'
})
export class NoteListComponent {
  @Input() notes: JournalResponse[] = [];
  @Input() selectedId: string | null = null;
  @Input() activeFilter: NoteFilter = 'All notes';
  @Input() searchTerm = '';
  @Input() collapsed = false;
  @Output() searchChange = new EventEmitter<Event>();
  @Output() noteSelected = new EventEmitter<string>();
  @Output() refresh = new EventEmitter<void>();
  @Output() menuToggle = new EventEmitter<void>();
  @Output() toggleCollapse = new EventEmitter<void>();

  /** Plain-text excerpt for the list: strips Markdown syntax instead of showing raw markup noise. */
  protected excerpt(content: string): string {
    const plain = content
      .replace(/```[\s\S]*?```/g, ' code block ')
      .replace(/!?\[([^\]]*)\]\([^)]*\)/g, '$1')
      .replace(/^\s{0,3}#{1,6}\s+/gm, '')
      .replace(/^\s{0,3}>\s?/gm, '')
      .replace(/^\s*[-*+]\s+/gm, '')
      .replace(/^:::.*$/gm, '')
      .replace(/[*_`~=]/g, '')
      .replace(/\s+/g, ' ')
      .trim();
    return plain.length > 140 ? plain.slice(0, 140).trimEnd() + '…' : plain;
  }

  formatDate(value: string): string { return new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric', year: 'numeric' }).format(new Date(value)); }
}
