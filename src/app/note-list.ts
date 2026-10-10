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
  @Output() searchChange = new EventEmitter<Event>();
  @Output() noteSelected = new EventEmitter<string>();
  @Output() refresh = new EventEmitter<void>();

  formatDate(value: string): string { return new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric', year: 'numeric' }).format(new Date(value)); }
}
