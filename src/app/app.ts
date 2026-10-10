import { Component, computed, HostListener, inject, OnInit, signal, ViewEncapsulation } from '@angular/core';
import { ApiService, AccessType, JournalResponse } from './api.service';
import { AuthPanelComponent } from './auth-panel';
import { NoteEditorComponent } from './note-editor';
import { NoteListComponent } from './note-list';
import { SidebarComponent } from './sidebar';
import { DraftField, NoteFilter, ThemeName } from './models';

@Component({
  selector: 'app-root',
  imports: [AuthPanelComponent, NoteEditorComponent, NoteListComponent, SidebarComponent],
  templateUrl: './app.html',
  styleUrl: './app.scss',
  encapsulation: ViewEncapsulation.None
})
export class App implements OnInit {
  private readonly api = inject(ApiService);
  protected readonly username = signal(localStorage.getItem('field-notes-user') || '');
  protected readonly token = signal(localStorage.getItem('field-notes-token'));
  protected readonly authMode = signal<'login' | 'register'>('login');
  protected readonly authError = signal('');
  protected readonly loading = signal(false);
  protected readonly activeFilter = signal<NoteFilter>('All notes');
  protected readonly searchTerm = signal('');
  protected readonly selectedNoteId = signal<string | null>(null);
  protected readonly notes = signal<JournalResponse[]>([]);
  protected readonly draftTitle = signal('');
  protected readonly draftContent = signal('');
  protected readonly draftVisibility = signal<AccessType>('PRIVATE');
  protected readonly isNewNote = signal(false);
  protected readonly savedTitle = signal('');
  protected readonly savedContent = signal('');
  protected readonly savedVisibility = signal<AccessType>('PRIVATE');
  protected readonly theme = signal<ThemeName>((localStorage.getItem('field-notes-theme') as ThemeName) || 'meadow');
  protected readonly isDirty = computed(() => this.draftTitle() !== this.savedTitle()
    || this.draftContent() !== this.savedContent()
    || this.draftVisibility() !== this.savedVisibility());
  protected readonly visibleNotes = computed(() => {
    const filter = this.activeFilter();
    const search = this.searchTerm().toLowerCase();
    return this.notes().filter((note) => {
      const matchesFilter = filter === 'All notes' || (filter === 'Private' ? note.accessType === 'PRIVATE' : note.accessType === 'PUBLIC');
      const matchesSearch = !search || `${note.title} ${note.content}`.toLowerCase().includes(search);
      return matchesFilter && matchesSearch;
    });
  });
  protected readonly selectedNote = computed(() => this.notes().find((note) => note.id === this.selectedNoteId()) ?? null);

  ngOnInit(): void {
    this.applyTheme(this.theme());
    if (this.token()) this.loadNotes();
  }

  @HostListener('window:keydown', ['$event'])
  protected handleKeyboardShortcut(event: KeyboardEvent): void {
    if (!this.token()) return;
    const target = event.target as HTMLElement;
    const isTyping = ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName);
    const key = event.key.toLowerCase();
    if ((event.ctrlKey || event.metaKey) && key === 'n') {
      event.preventDefault();
      this.startNewNote();
    } else if ((event.ctrlKey || event.metaKey) && key === 's') {
      event.preventDefault();
      this.saveNote();
    } else if (!isTyping && key === 'd') {
      event.preventDefault();
      this.deleteNote();
    } else if (!isTyping && key === 's') {
      event.preventDefault();
      this.saveNote();
    }
  }

  protected submitAuth(event: Event): void {
    event.preventDefault();
    const form = new FormData(event.target as HTMLFormElement);
    const username = String(form.get('username') || '').trim();
    const password = String(form.get('password') || '');
    const email = String(form.get('email') || '').trim();
    this.authError.set('');
    this.loading.set(true);
    const request = this.authMode() === 'login'
      ? this.api.login(username, password)
      : this.api.register(username, email, password);
    request.subscribe({
      next: (response) => {
        this.loading.set(false);
        if (this.authMode() === 'login') {
          const login = response as { accessToken: string };
          localStorage.setItem('field-notes-token', login.accessToken);
          localStorage.setItem('field-notes-user', username);
          this.token.set(login.accessToken);
          this.username.set(username);
          this.loadNotes();
        } else {
          this.authMode.set('login');
          this.authError.set('Account created. Sign in to continue.');
        }
      },
      error: (error: Error) => { this.loading.set(false); this.authError.set(error.message); }
    });
  }

  protected loadNotes(): void {
    this.api.getJournals().subscribe({
      next: (notes) => {
        this.notes.set(notes);
        if (notes.length) this.selectNote(this.selectedNoteId() || notes[0].id);
      },
      error: (error: Error) => this.authError.set(error.message)
    });
  }

  protected selectFilter(filter: NoteFilter): void { this.activeFilter.set(filter); }
  protected selectNote(id: string): void {
    const note = this.notes().find((item) => item.id === id);
    if (!note) return;
    this.selectedNoteId.set(id);
    this.isNewNote.set(false);
    this.draftTitle.set(note.title);
    this.draftContent.set(note.content);
    this.draftVisibility.set(note.accessType);
    this.savedTitle.set(note.title);
    this.savedContent.set(note.content);
    this.savedVisibility.set(note.accessType);
  }
  protected updateSearch(event: Event): void { this.searchTerm.set((event.target as HTMLInputElement).value); }
  protected updateDraft(change: { field: DraftField; value: string }): void {
    const { field, value } = change;
    if (field === 'title') this.draftTitle.set(value);
    if (field === 'content') this.draftContent.set(value);
    if (field === 'visibility') this.draftVisibility.set(value as AccessType);
  }
  protected startNewNote(): void {
    this.selectedNoteId.set(null);
    this.isNewNote.set(true);
    this.draftTitle.set('');
    this.draftContent.set('');
    this.draftVisibility.set('PRIVATE');
    this.savedTitle.set('');
    this.savedContent.set('');
    this.savedVisibility.set('PRIVATE');
  }
  protected saveNote(): void {
    const title = this.draftTitle().trim();
    const content = this.draftContent().trim();
    if (!title || !content) { this.authError.set('Add a title and content before saving.'); return; }
    const selectedId = this.selectedNoteId();
    const request = selectedId && !this.isNewNote()
      ? this.api.updateJournal(selectedId, title, content, this.draftVisibility())
      : this.api.createJournal(title, content, this.draftVisibility());
    request.subscribe({ next: (note) => { this.notes.update((notes) => selectedId ? notes.map((item) => item.id === note.id ? note : item) : [note, ...notes]); this.selectNote(note.id); this.authError.set(''); }, error: (error: Error) => this.authError.set(error.message) });
  }
  protected deleteNote(): void {
    const selectedId = this.selectedNoteId();
    if (!selectedId || this.isNewNote()) return;
    this.api.deleteJournal(selectedId).subscribe({ next: () => { this.notes.update((notes) => notes.filter((note) => note.id !== selectedId)); const next = this.notes()[0]; if (next) this.selectNote(next.id); else this.startNewNote(); }, error: (error: Error) => this.authError.set(error.message) });
  }
  protected signOut(): void {
    localStorage.removeItem('field-notes-token');
    localStorage.removeItem('field-notes-user');
    this.token.set(null);
    this.username.set('');
    this.notes.set([]);
  }
  protected setAuthMode(mode: 'login' | 'register'): void { this.authMode.set(mode); this.authError.set(''); }
  protected setTheme(event: Event): void {
    const value = (event.target as HTMLSelectElement).value as ThemeName;
    this.theme.set(value);
    localStorage.setItem('field-notes-theme', value);
    this.applyTheme(value);
  }
  protected applyTheme(value: string): void { document.documentElement.setAttribute('data-theme', value); }
  protected formatDate(value: string): string { return new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric', year: 'numeric' }).format(new Date(value)); }
}
