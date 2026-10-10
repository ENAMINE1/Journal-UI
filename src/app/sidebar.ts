import { Component, EventEmitter, Input, Output } from '@angular/core';
import { JournalResponse } from './api.service';
import { NoteFilter, ThemeName } from './models';

@Component({
  selector: 'app-sidebar',
  standalone: true,
  templateUrl: './sidebar.html',
  styleUrl: './sidebar.scss'
})
export class SidebarComponent {
  @Input() username = '';
  @Input() notes: JournalResponse[] = [];
  @Input() activeFilter: NoteFilter = 'All notes';
  @Input() theme: ThemeName = 'meadow';
  @Output() newNote = new EventEmitter<void>();
  @Output() filterChange = new EventEmitter<NoteFilter>();
  @Output() themeChange = new EventEmitter<Event>();
  @Output() signOut = new EventEmitter<void>();
}
