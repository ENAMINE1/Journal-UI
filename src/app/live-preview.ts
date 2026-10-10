import { EditorView, Decoration, DecorationSet, WidgetType } from '@codemirror/view';
import { EditorState, RangeSetBuilder, StateField } from '@codemirror/state';
import { enhanceRenderedMarkdown, renderMarkdownBlock } from './markdown-render';

/**
 * Obsidian-style live preview: every Markdown block renders as formatted content
 * while the cursor is elsewhere; the block containing the cursor stays raw so
 * typing feels natural. Data model stays plain Markdown.
 *
 * Block decorations must be provided by a StateField (not a ViewPlugin) in
 * CodeMirror 6 — providing them from a plugin throws
 * "Block decorations may not be specified via plugins".
 */

class MarkdownBlockWidget extends WidgetType {
  constructor(readonly html: string) { super(); }

  override eq(other: MarkdownBlockWidget): boolean { return other.html === this.html; }

  override toDOM(): HTMLElement {
    const div = document.createElement('div');
    div.className = 'cm-md-block markdown-preview';
    div.innerHTML = this.html;
    // Buttons/labels are created here (not in the HTML string) so widget reuse (eq)
    // preserves them and they keep working without Angular change detection.
    enhanceRenderedMarkdown(div);
    return div;
  }

  /** Let the editor handle clicks (repositions cursor, activates the block for editing),
   *  except on interactive elements the widget manages itself. */
  override ignoreEvent(event: Event): boolean {
    const target = event.target as HTMLElement | null;
    return !!target?.closest?.('.copy-code, a, summary, input, button');
  }
}

interface BlockRange { from: number; to: number; text: string; }

/** Group lines into Markdown blocks separated by blank lines, keeping fenced code
 *  blocks and ::: callout/details blocks intact as single units. */
function computeBlocks(state: EditorState): BlockRange[] {
  const doc = state.doc;
  const blocks: BlockRange[] = [];
  let from = -1;
  let to = -1;
  let lines: string[] = [];
  let fence: string | null = null;
  let inCustomBlock = false;

  const close = (): void => {
    if (from >= 0) blocks.push({ from, to, text: lines.join('\n') });
    from = -1;
    lines = [];
  };

  for (let number = 1; number <= doc.lines; number++) {
    const line = doc.line(number);
    const text = line.text;
    const fenceMarker = /^ {0,3}(```|~~~)/.exec(text);

    if (fence) {
      lines.push(text);
      to = line.to;
      if (fenceMarker && text.trim().startsWith(fence)) { fence = null; close(); }
      continue;
    }
    if (fenceMarker) {
      close();
      from = line.from;
      to = line.to;
      lines = [text];
      fence = text.trim().startsWith('```') ? '```' : '~~~';
      continue;
    }
    if (inCustomBlock) {
      lines.push(text);
      to = line.to;
      if (/^ {0,3}:::\s*$/.test(text)) { inCustomBlock = false; close(); }
      continue;
    }
    if (/^ {0,3}:::/.test(text)) {
      close();
      from = line.from;
      to = line.to;
      lines = [text];
      inCustomBlock = true;
      continue;
    }
    if (!text.trim()) { close(); continue; }
    if (from < 0) from = line.from;
    lines.push(text);
    to = line.to;
  }
  close();
  return blocks;
}

function buildDecorations(state: EditorState): DecorationSet {
  const builder = new RangeSetBuilder<Decoration>();
  const selection = state.selection;
  for (const block of computeBlocks(state)) {
    const active = selection.ranges.some((range) => range.to >= block.from && range.from <= block.to);
    if (active) continue;
    const html = renderMarkdownBlock(block.text);
    if (!html.trim()) continue;
    builder.add(block.from, block.to, Decoration.replace({ widget: new MarkdownBlockWidget(html), block: true }));
  }
  return builder.finish();
}

const livePreviewField = StateField.define<DecorationSet>({
  create: (state) => buildDecorations(state),
  update: (decorations, transaction) =>
    transaction.docChanged || transaction.selection
      ? buildDecorations(transaction.state)
      : decorations,
  provide: (field) => EditorView.decorations.from(field)
});

/** Live-preview extension: renders all inactive blocks as formatted widgets. */
export function livePreview() {
  return livePreviewField;
}
