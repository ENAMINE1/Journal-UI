---
name: knowledge-editor-ui
description: Design, redesign, implement, and polish browser-based knowledge editors inspired by Obsidian, Notion, and premium developer documentation. Use when improving editor UI, Markdown rendering, syntax-highlighted code blocks, typography, block interactions, themes, or the reading and writing experience.
---

# Knowledge Editor UI Design Skill

## Objective

Create a premium knowledge workspace that combines Obsidian's technical readability and Markdown rendering with Notion's polished editing experience and effortless organization.

The result should feel calm, precise, elegant, and enjoyable to use. Optimize for real usability, not decorative visuals.

## 1. Inspect before implementing

Before changing code:

- Inspect the project structure, framework, package.json, existing editor, styles, components, state management, and persistence.
- Identify specific visual and usability weaknesses in the current UI.
- Preserve working functionality, data models, routes, and existing architectural decisions.
- Reuse installed dependencies and existing components when appropriate.
- If Figma MCP is available and a design URL is provided, inspect the relevant frames before implementation.
- Create a short implementation plan, then make the changes directly in the existing codebase.

Never replace the application with an unrelated mockup or generic dashboard.

## 2. Design philosophy

Follow these principles:

- Content is the primary visual element.
- Typography, spacing, contrast, and alignment should establish hierarchy.
- Prefer restrained neutral surfaces with a distinctive accent color.
- Avoid excessive cards, borders, gradients, shadows, and decorative elements.
- Reveal contextual controls on hover or focus instead of displaying everything permanently.
- Keep interactions predictable, responsive, and keyboard accessible.
- Maintain visual consistency across all components and themes.

## 3. Workspace layout

Where appropriate, use three functional areas:

### Navigation sidebar
- Workspace navigation, folders, nested notes, favorites, recent documents, and search.
- Clear active, hover, expanded, and focus states.
- Collapsible or resizable panels where useful.

### Document canvas
- Breadcrumbs, title, metadata, tags, and save status.
- Centered reading column with a comfortable line length of approximately 680–800px.
- Rich Markdown rendering and an uncluttered editing experience.
- Wider code blocks and tables when needed.

### Contextual sidebar
- Table of contents, active heading, backlinks, and related notes where supported.
- Collapsible and responsive behavior.

Do not force every panel to remain visible. Prioritize the document canvas.

## 4. Design system and typography

Centralize tokens for:

- Colors, surfaces, borders, text, accents, and semantic states.
- Font families, font sizes, weights, line heights, and letter spacing.
- Spacing, radii, shadows, panel widths, and breakpoints.
- Hover, focus, selected, disabled, and loading states.
- Light and dark themes.

Use readable typography, comfortable paragraph spacing, consistent heading hierarchy, and carefully aligned lists.

Use sans-serif typography for navigation and headings, readable prose typography for long documents, and monospace typography for code.

Avoid overly narrow line heights, cramped spacing, weak contrast, and arbitrary font sizes.

## 5. Markdown rendering

Use a proper Markdown parser and an extensible rendering pipeline. Avoid regex-based Markdown parsing and unsafe HTML injection.

Support the syntax appropriate to the existing application:

- H1–H6, paragraphs, emphasis, inline code, and links.
- Nested ordered and unordered lists.
- Task lists, blockquotes, and horizontal rules.
- Tables, images, embeds, and internal links.
- Callouts, footnotes, and mathematical notation where supported.

Preserve the existing document format and serialization conventions. If Markdown is the source of truth, keep it portable.

Create reusable renderers for distinct block types. Maintain consistent spacing and typography between them.

## 6. Code blocks

Code rendering is a first-class feature.

Prefer Shiki for read-only syntax-highlighted code. Consider CodeMirror 6 for editable code blocks requiring live syntax highlighting. Reuse an existing suitable library if the project already has one.

Support relevant languages such as C++, Java, JavaScript, TypeScript, Python, SQL, Bash, JSON, YAML, HTML, CSS, and Go.

Provide:

- Accurate language-aware syntax highlighting.
- Carefully selected light and dark themes.
- A compact language label and optional filename.
- A copy button with clear feedback.
- Optional line numbers and highlighted lines.
- Proper indentation and whitespace preservation.
- Appropriate line wrapping or horizontal scrolling.
- Graceful handling of unknown languages and plain text.

Use a consistent monospace font, comfortable line height, restrained code background, and subtle separation from surrounding prose.

Do not manually color tokens with regular expressions. Preserve the original code exactly when copying. Never execute rendered code.

## 7. Rich content blocks

Implement reusable components for:

- Notes, tips, warnings, and danger callouts.
- Quotes and highlighted passages.
- Task lists and checklists.
- Tables, images, and embeds.
- Inline and display mathematics using KaTeX or an appropriate existing renderer.

Give each block a recognizable visual treatment without making the document noisy.

## 8. Editing interactions

If the application supports editing, preserve it and improve the actual editing experience.

Reuse the existing editor where possible. Consider Tiptap for structured rich-text editing, with suitable extensions for custom blocks.

Prioritize:

- Predictable cursor behavior and natural typing.
- Slash-command menus for inserting blocks.
- Inline formatting toolbars on text selection.
- Contextual block actions and drag handles.
- Keyboard shortcuts, undo, and redo.
- Reliable autosave and clear save/error states.
- Consistent keyboard navigation and focus behavior.

Avoid wrapping every paragraph in a separate bordered card. Documents should flow naturally.

Preserve the current editor's data model and serialization pipeline unless a change is genuinely necessary.

## 9. Interaction quality

Make the interface feel polished through small, purposeful details:

- Subtle hover and focus transitions.
- Tooltips for ambiguous icon-only controls.
- Contextual actions revealed when needed.
- Responsive menus and dialogs.
- Useful empty, loading, error, and success states.
- Appropriate reduced-motion support.
- Accessible keyboard focus and semantic HTML.

Avoid unnecessary modal dialogs, intrusive notifications, excessive animation, and interactions that require a mouse when a keyboard alternative is practical.

## 10. Responsive behavior and accessibility

Ensure the editor works on desktop, tablet, and mobile.

Collapse sidebars into drawers on smaller screens. Preserve readable text, usable editing controls, and sensible handling of wide code blocks and tables.

Use semantic HTML, appropriate ARIA attributes, visible focus indicators, and sufficient contrast.

Sanitize untrusted content and prevent rendered Markdown or embedded content from executing arbitrary scripts.

## 11. Implementation discipline

- Follow the existing framework and coding conventions.
- Use small, reusable components with clear responsibilities.
- Centralize design tokens and avoid duplicated CSS.
- Reuse dependencies before introducing new ones.
- Preserve existing functionality and real application data.
- Avoid unnecessary architectural rewrites.
- Implement actual behavior rather than decorative controls.
- Run relevant builds, type checks, linting, and tests after changes.
- Use available browser previews or screenshots to inspect the result visually.

## 12. Recommended workflow

1. Audit the current implementation and identify the biggest usability problems.
2. Establish the visual direction and design tokens.
3. Improve layout, typography, spacing, and document hierarchy.
4. Upgrade Markdown and code-block rendering.
5. Refine editing controls and block interactions.
6. Improve themes, responsive behavior, and accessibility.
7. Run checks and fix regressions.
8. Visually inspect and refine the implementation.

Prioritize the largest user-experience improvements first rather than implementing every possible feature at once.

## Definition of done

The result should look intentionally designed, make long technical notes pleasant to read, render code beautifully, provide consistent rich-content blocks, and make writing and navigation feel effortless.

Both themes should be polished, existing functionality must remain intact, and the application must pass its relevant checks.

Always adapt these guidelines to the existing application rather than forcing a predetermined architecture or technology stack.
