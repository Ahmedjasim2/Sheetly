# Agent guidance for Sheetly

## Mission and boundary

Sheetly is an open-source browser spreadsheet built from scratch with React, TypeScript, and Vite. Keep it focused on a simple, click-first workflow. The current implementation includes an immutable core, plain HTML grid, multiple sheets, CSV/XLSX value I/O, bounded undo/redo, range operations, session-only formatting, English/Arabic UI, light/dark themes, printing, and optional local Ollama assistance.

Do not start formula evaluation, cloud sync, accounts, collaboration, persistence, macros/VBA, a backend, or Tauri without an explicit request.

## Commands

    npm install
    npm run dev        # Vite on port 3000
    npm run build      # tsc -b && vite build
    npm run preview
    npm run typecheck
    npm run lint
    npm run test
    npm run test:watch
    npm run check      # typecheck + lint + test

Before reporting completion, run npm run check; run npm run build for changes affecting the bundle, entry points, configuration, imports, or dependencies. Report actual results. If dependencies are absent, run npm install.

## Architecture

- src/core contains framework-free business logic. It must not import React, touch the DOM, use browser APIs, or own UI state.
- src/ui contains React components, browser file/download APIs, keyboard interaction, reducer state, and presentation.
- Keep parsing, validation, mutations, sorting, filtering, calculations, cleaning, dedupe, and file conversion in src/core, not JSX.
- src/ui/state/gridState.ts coordinates sheets, selection, editing, filters, clipboard, history, notices, confirmations, styles, and dirty state.
- The grid is a plain HTML table; adding a grid library requires discussion of license, bundle size, accessibility, and performance.
- Prefer small, readable immutable updates and preserve identity for no-op operations.

## Invariants

- Coordinates are zero-based; formatCellId(0, 0) is A1.
- Sheet.cells is sparse. Empty cells read as null; empty string, 0, and false are real values.
- Cell values are only string, number, boolean, or null; reject undefined, objects, NaN, and infinities.
- Out-of-bounds reads/writes throw RangeError; indexes/counts must be safe integers.
- Sheet/workbook operations are immutable. Row/column insertion shifts cells; deletion removes deleted cells and shifts the remainder.
- Formatting is separate from values, per-sheet, session-only, excluded from undo/redo, and excluded from CSV/XLSX.
- The default sheet is Quarterly Sales, 30 rows by 12 columns, with no seeded data.

Any core behavior change needs unit tests for normal, boundary, no-op, and invalid-input cases as appropriate.

## File formats

CSV parsing/serialization lives in src/core/csv; browser file selection/download stays in src/ui. CSV import replaces the active sheet only after confirmation, imports fields as text, and supports quoted commas, quotes, newlines, ragged rows, Unicode, and Arabic. Export is UTF-8 with CRLF line endings.

XLSX uses ExcelJS in src/core/xlsx and is dynamically loaded. Import reads the first worksheet; export writes one worksheet. Dates become ISO strings and formulas remain text without evaluation. Never claim to preserve styles, charts, images, merges, frozen panes, macros, or multiple worksheets. Corrupt/unsupported files need a user-visible error.

## State and interaction

- Selection is an anchor/focus pair; focus is the active cell and ranges are rectangular.
- Copy stores a typed internal CellBlock; paste starts at the selection top-left, clips to bounds, clears targets for nulls, and creates one undo entry. There is no OS clipboard integration.
- History is immutable, per active sheet, and limited to 100 snapshots. Record data changes only; do not record selection, drafts, filtering, calculations, prompts, formatting, or no-ops.
- Undo/redo closes editing and clamps or clears selection as needed. Preserve Ctrl/Cmd+Z, Ctrl/Cmd+Y, and Ctrl/Cmd+Shift+Z without hijacking native text editing.
- Filtering is view-only, targets the focus column, preserves source row numbers, never changes the sheet, and never enters history. Recompute after edits; clear it when structure/import changes.
- Sorting moves whole rows, uses the focus column, keeps empty cells last, and records one change only when order changes.
- Calculations are explicit and non-destructive; numeric operations ignore text, booleans, and empty cells; count counts numbers only.
- Clean text changes only strings. Find/replace is literal and text-only. Dedupe compares typed values across selected columns, keeps the first row, removes whole rows, and is blocked while filtering.
- Dirty state is set by data changes and cleared only after successful CSV/XLSX export. Do not persist workbook data in localStorage.

## UI rules

- Preserve the responsive shell, semantic light/dark theme, English/Arabic LTR/RTL behavior, and browser print CSS.
- Every visible command must work or be disabled with a clear deferred explanation. Do not add fake window controls.
- Preserve arrows, Shift+arrows, Enter, Escape, Delete, Ctrl/Cmd+C/V/X/Z/Y, and Ctrl/Cmd+F.
- Keep components presentational; do not move core rules into JSX.
- New UI behavior needs a Testing Library test with accessible labels, roles, and states.

## AI safety

AI is opt-in and disabled by default. The only provider is local Ollama. Do not treat 0.0.0.0, private-network addresses, .local names, or arbitrary hosts as guaranteed local.

Only the selected range may be sent, bounded by cell/character limits; hidden rows are excluded and warned about. Never include the whole workbook, filenames, paths, or configuration. Treat model output as untrusted: parse JSON, reject unknown actions and forbidden network/command intent, and require action ranges to stay inside the selection.

Allowed actions are calculate, clean_text, sort, filter, find_replace, and remove_duplicates. Mutations must follow preview → validation → apply and use normal reducer/history. Do not add cloud AI, telemetry, an installer, or a model downloader.

## Conventions and definition of done

- Single quotes, no semicolons, and import type for type-only imports.
- Keep strict TypeScript clean; do not add any, suppressions, or unused values to silence errors.
- Follow existing naming/export patterns. Check licenses before proposing dependencies.
- Excel/LibreOffice are behavioral references only; do not copy their source, assets, icons, or distinctive design.

1. Add/update tests for changed behavior.
2. Run npm run check.
3. Run npm run build when app integration or the bundle is affected.
4. Inspect git diff and git status, preserving unrelated changes.
5. Report exact validation commands/results and any known limitation.
