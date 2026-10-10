import { AfterViewChecked, AfterViewInit, Component, ElementRef, EventEmitter, HostListener, inject, Input, OnChanges, OnDestroy, Output, signal, SimpleChanges, ViewChild } from '@angular/core';
import { Compartment, EditorState } from '@codemirror/state';
import { EditorView, keymap, placeholder as cmPlaceholder } from '@codemirror/view';
import { defaultKeymap, history, historyKeymap } from '@codemirror/commands';
import { defaultHighlightStyle, syntaxHighlighting } from '@codemirror/language';
import { insertNewlineContinueMarkup, markdown } from '@codemirror/lang-markdown';
import { AccessType, JournalResponse } from './api.service';
import { DraftField } from './models';
import { configureMarkdown, enhanceRenderedMarkdown, renderDocument } from './markdown-render';
import { livePreview } from './live-preview';

export type EditorMode = 'live' | 'source' | 'reading';

@Component({
  selector: 'app-note-editor',
  standalone: true,
  templateUrl: './note-editor.html',
  styleUrl: './note-editor.scss'
})
export class NoteEditorComponent implements AfterViewInit, AfterViewChecked, OnChanges, OnDestroy {
  protected readonly slashMenuOpen = signal(false);
  /** live = Obsidian-style (formatted as you write), source = raw markdown, reading = rendered. */
  protected readonly mode = signal<EditorMode>('live');
  /** Heading currently in view — highlighted in the document outline. */
  protected readonly activeHeading = signal('');
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
  @Input() deleteArmed = false;
  @Input() error = '';
  @Output() draftChange = new EventEmitter<{ field: DraftField; value: string }>();
  @Output() save = new EventEmitter<void>();
  @Output() delete = new EventEmitter<void>();
  @Output() back = new EventEmitter<void>();
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);
  @ViewChild('cmHost', { static: false }) private readonly cmHostRef?: ElementRef<HTMLElement>;
  private view: EditorView | null = null;
  private readonly livePreviewCompartment = new Compartment();
  private updateScheduled = false;
  private outlineLockUntil = 0;
  private readonly handleSurfaceScroll = (): void => this.scheduleActiveHeadingUpdate();

  constructor() {
    configureMarkdown();
  }

  get renderedContent(): string {
    return renderDocument(this.content || '_Start writing to see the rendered note._');
  }

  /**
   * Angular sanitizes [innerHTML], which strips injected <button> elements and
   * id attributes. Enhance the rendered preview programmatically instead:
   * real copy buttons, language labels, and heading anchors for the TOC.
   */
  ngAfterViewChecked(): void {
    const reading = this.host.nativeElement.querySelector('.reading-view');
    if (reading) enhanceRenderedMarkdown(reading as HTMLElement);
  }

  protected scrollToHeading(text: string): void {
    const host = this.host.nativeElement;
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (this.mode() === 'reading') {
      const heading = Array.from(host.querySelectorAll<HTMLElement>('.reading-view h1, .reading-view h2, .reading-view h3'))
        .find((element) => element.textContent?.trim() === text);
      heading?.scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth', block: 'start' });
      // Keep the clicked item highlighted while the smooth scroll settles;
      // scroll events during the animation would otherwise recompute the highlight.
      this.outlineLockUntil = Date.now() + 1200;
      this.activeHeading.set(text);
      return;
    }
    // Edit modes: place the cursor on the heading line (the block becomes editable,
    // the outline highlights it) and let CodeMirror scroll it into view.
    const view = this.view;
    if (!view) return;
    const pattern = new RegExp(`^#{1,3}\\s+${text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s*$`);
    const doc = view.state.doc;
    for (let number = 1; number <= doc.lines; number++) {
      const line = doc.line(number);
      if (pattern.test(line.text)) {
        view.dispatch({ selection: { anchor: line.from }, scrollIntoView: true });
        view.focus();
        return;
      }
    }
  }

  /** Outline highlight: in edit modes follow the cursor's section (Obsidian-style);
 *  in reading mode follow the scroll position. */
  private updateActiveHeading(): void {
    if (this.mode() === 'reading') {
      if (Date.now() < this.outlineLockUntil) return;
      const headings = Array.from(this.host.nativeElement.querySelectorAll<HTMLElement>('.reading-view h1, .reading-view h2, .reading-view h3'));
      if (!headings.length) {
        if (this.activeHeading()) this.activeHeading.set('');
        return;
      }
      let active = headings[0].textContent?.trim() || '';
      for (const heading of headings) {
        if (heading.getBoundingClientRect().top <= 140) active = heading.textContent?.trim() || active;
        else break;
      }
      this.activeHeading.set(active);
      return;
    }
    const view = this.view;
    if (!view) return;
    const head = view.state.selection.main.head;
    const doc = view.state.doc;
    let active = '';
    for (let number = 1; number <= doc.lines; number++) {
      const line = doc.line(number);
      if (line.from > head) break;
      const match = /^(#{1,6})\s+(.+?)\s*$/.exec(line.text);
      if (match) active = match[2];
    }
    this.activeHeading.set(active);
  }

  private scheduleActiveHeadingUpdate(): void {
    if (this.updateScheduled) return;
    this.updateScheduled = true;
    requestAnimationFrame(() => {
      this.updateScheduled = false;
      this.updateActiveHeading();
    });
  }

  get headings(): Array<{ text: string; level: number }> {
    return [...this.content.matchAll(/^(#{1,3})\s+(.+)$/gm)].map((match) => ({ level: match[1].length, text: match[2].trim() }));
  }

  formatDate(value: string): string { return new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric', year: 'numeric' }).format(new Date(value)); }

  update(field: DraftField, event: Event): void {
    const value = (event.target as HTMLInputElement | HTMLSelectElement).value;
    this.draftChange.emit({ field, value });
  }

  protected focusEditor(): void { this.view?.focus(); }

  ngAfterViewInit(): void { this.createView(); }

  ngOnChanges(changes: SimpleChanges): void {
    const change = changes['content'];
    if (!change || !this.view) return;
    const next = change.currentValue as string;
    if (next !== this.view.state.doc.toString()) {
      this.view.dispatch({
        changes: { from: 0, to: this.view.state.doc.length, insert: next },
        selection: { anchor: 0 }
      });
      this.view.scrollDOM.scrollTop = 0;
    }
    this.scheduleActiveHeadingUpdate();
  }

  ngOnDestroy(): void {
    window.removeEventListener('scroll', this.handleSurfaceScroll, true);
    this.view?.destroy();
    this.view = null;
  }

  private createView(): void {
    const host = this.cmHostRef?.nativeElement;
    if (!host || this.view) return;
    this.view = new EditorView({
      parent: host,
      state: EditorState.create({
        doc: this.content,
        extensions: [
          history(),
          keymap.of([
            { key: 'Enter', run: insertNewlineContinueMarkup },
            { key: 'Escape', run: () => { if (this.slashMenuOpen()) { this.slashMenuOpen.set(false); return true; } return false; } },
            ...defaultKeymap,
            ...historyKeymap
          ]),
          EditorView.lineWrapping,
          cmPlaceholder('Start writing… type / for commands'),
          markdown(),
          syntaxHighlighting(defaultHighlightStyle),
          this.livePreviewCompartment.of(this.mode() === 'live' ? livePreview() : []),
          EditorView.updateListener.of((update) => {
            if (update.docChanged) {
              this.draftChange.emit({ field: 'content', value: update.state.doc.toString() });
              this.scheduleActiveHeadingUpdate();
            }
            if (update.docChanged || update.selectionSet) {
              this.scheduleActiveHeadingUpdate();
            }
            if (update.docChanged || update.selectionSet) {
              const before = update.state.doc.sliceString(0, update.state.selection.main.head);
              this.slashMenuOpen.set(/(?:^|\n)[ \t]*\/[\w-]*$/.test(before));
            }
          })
        ]
      })
    });
    // Window-level capture listener: catches scrolling anywhere (page body,
    // CM scroller, reading view) — scroll events don't bubble, but capture passes through ancestors.
    window.addEventListener('scroll', this.handleSurfaceScroll, true);
    this.scheduleActiveHeadingUpdate();
  }

  /** Live = formatted as you write, Source = raw markdown, Reading = rendered document. */
  protected setMode(mode: EditorMode): void {
    if (this.mode() === mode) return;
    this.mode.set(mode);
    this.slashMenuOpen.set(false);
    if (!this.view) return;
    this.view.dispatch({ effects: this.livePreviewCompartment.reconfigure(mode === 'live' ? livePreview() : []) });
    if (mode !== 'reading') this.view.focus();
    this.scheduleActiveHeadingUpdate();
  }

  @HostListener('window:keydown', ['$event'])
  protected toggleReadingView(event: KeyboardEvent): void {
    if (!(event.ctrlKey || event.metaKey) || event.key.toLowerCase() !== 'e') return;
    event.preventDefault();
    this.setMode(this.mode() === 'reading' ? 'live' : 'reading');
  }

  /** Markdown formatting toolbar actions on the CodeMirror surface. */
  protected applyFormat(format: string): void {
    const view = this.view;
    if (!view) return;
    const { state } = view;
    const selection = state.selection.main;
    const selected = state.sliceDoc(selection.from, selection.to);
    const replaceSelection = (insert: string, anchorOffset: number, headOffset = anchorOffset): void => {
      view.dispatch({
        changes: { from: selection.from, to: selection.to, insert },
        selection: { anchor: selection.from + anchorOffset, head: selection.from + headOffset },
        scrollIntoView: true
      });
    };
    const wrapSelection = (marker: string): void => {
      const inner = selected || 'text';
      replaceSelection(`${marker}${inner}${marker}`, marker.length, marker.length + inner.length);
    };
    const prefixLines = (prefix: string): void => {
      const first = state.doc.lineAt(selection.from).number;
      const last = state.doc.lineAt(selection.to).number;
      const changes: Array<{ from: number; insert: string }> = [];
      for (let number = first; number <= last; number++) changes.push({ from: state.doc.line(number).from, insert: prefix });
      view.dispatch({ changes });
    };
    switch (format) {
      case 'bold': wrapSelection('**'); break;
      case 'italic': wrapSelection('*'); break;
      case 'code': wrapSelection('`'); break;
      case 'heading': prefixLines('## '); break;
      case 'bullet': prefixLines('- '); break;
      case 'quote': prefixLines('> '); break;
      case 'check': prefixLines('- [ ] '); break;
      case 'codeblock': {
        const inner = selected || 'code';
        const lead = '\n```\n';
        replaceSelection(`\n\`\`\`\n${inner}\n\`\`\`\n`, lead.length, lead.length + inner.length);
        break;
      }
      case 'details': {
        const inner = selected || 'Details';
        const lead = '\n::: details Details\n';
        replaceSelection(`\n::: details Details\n${inner}\n:::\n`, lead.length, lead.length + inner.length);
        break;
      }
    }
    view.focus();
  }

  /** Insert the chosen snippet in place of the typed "/" slash command. */
  protected applySlashCommand(format: string): void {
    const view = this.view;
    if (!view) return;
    const head = view.state.selection.main.head;
    const before = view.state.doc.sliceString(0, head);
    const slashStart = before.lastIndexOf('/');
    const lineStart = before.lastIndexOf('\n') + 1;
    this.slashMenuOpen.set(false);
    if (slashStart < lineStart) return;
    const snippets: Record<string, string> = {
      heading: '## ', bullet: '- ', check: '- [ ] ', quote: '> ', codeblock: '```\n\n```', details: '::: details Details\n\n:::'
    };
    const insert = snippets[format] ?? '';
    view.dispatch({ changes: { from: slashStart, to: head, insert }, selection: { anchor: slashStart + insert.length } });
    view.focus();
  }
}
