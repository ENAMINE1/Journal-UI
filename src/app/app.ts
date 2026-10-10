import { Component, computed, signal } from '@angular/core';

interface Note {
  id: number;
  title: string;
  content: string;
  date: string;
  visibility: 'Private' | 'Shared';
}

@Component({
  selector: 'app-root',
  imports: [],
  templateUrl: './app.html',
  styleUrl: './app.scss'
})
export class App {
  protected readonly username = 'Shashwat';
  protected readonly activeFilter = signal<'All notes' | 'Private' | 'Shared'>('All notes');
  protected readonly searchTerm = signal('');
  protected readonly selectedNoteId = signal(1);
  protected readonly notes = signal<Note[]>([
    { id: 1, title: 'Monday observations', content: 'A few lines from the walk back and the idea I almost forgot.', date: 'OCT 09, 2026', visibility: 'Private' },
    { id: 2, title: 'Project North Star', content: 'Questions to bring to tomorrow\'s conversation with the team.', date: 'OCT 07, 2026', visibility: 'Shared' },
    { id: 3, title: 'Reading list', content: 'Books, essays, and references worth returning to later.', date: 'SEP 30, 2026', visibility: 'Private' }
  ]);
  protected readonly visibleNotes = computed(() => {
    const filter = this.activeFilter();
    const search = this.searchTerm().toLowerCase();
    return this.notes().filter((note) => {
      const matchesFilter = filter === 'All notes' || note.visibility === filter;
      const matchesSearch = !search || `${note.title} ${note.content}`.toLowerCase().includes(search);
      return matchesFilter && matchesSearch;
    });
  });
  protected readonly selectedNote = computed(() => this.notes().find((note) => note.id === this.selectedNoteId()) ?? this.notes()[0]);

  protected selectFilter(filter: 'All notes' | 'Private' | 'Shared'): void { this.activeFilter.set(filter); }
  protected selectNote(id: number): void { this.selectedNoteId.set(id); }
  protected updateSearch(event: Event): void { this.searchTerm.set((event.target as HTMLInputElement).value); }
  protected startNewNote(): void {
    const newNote = { id: Date.now(), title: 'Untitled note', content: 'Start writing...', date: 'JUST NOW', visibility: 'Private' as const };
    this.notes.update((notes) => [newNote, ...notes]);
    this.selectedNoteId.set(newNote.id);
  }
}
