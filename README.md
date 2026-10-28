# sheetly

An open-source spreadsheet app built from scratch with React, TypeScript, and Vite. The design is our own; LibreOffice and Excel are used only as behavioral references, never copied.

> **Status: Active development.** The project shell, a pure data model, a plain-HTML grid UI (range selection, editing, row/column ops), CSV import/export, bounded undo/redo, range copy/paste, visible calculations, sort, view-only filtering, text cleanup, literal find/replace, range-scoped duplicate-row removal, data-loss protection, single-sheet XLSX import/export (cell values only), light/dark themes with i18n (English/Arabic), and opt-in Sheetly AI (local-only placeholder) are in place. No formulas, cloud sync, or Tauri yet.

## Tech stack

| Area | Choice | License |
| --- | --- | --- |
| UI | React 19 + React DOM | MIT |
| Build/dev | Vite + `@vitejs/plugin-react` | MIT |
| Language | TypeScript 6 (strict) | Apache-2.0 |
| Tests | Vitest + jsdom | MIT |
| Component tests | `@testing-library/react` + `@testing-library/jest-dom` | MIT |
| Lint | oxlint | MIT |
| XLSX | exceljs 4.4.0 | MIT |

## Prerequisites

- Node.js **20.19+** or **22.12+** (required by Vite 8)
- npm 10+

Checked with Node.js 24.22.1 and npm 12.2.1.

## Installation

```bash
npm install
```

## Development

```bash
npm run dev
```

Vite prints the local URL (usually `http://localhost:5173`).

## Build

```bash
npm run build
```

This runs the TypeScript project build first, then produces a production bundle in `dist/`.

Preview the production build locally:

```bash
npm run preview
```

## Testing and quality

```bash
npm run test        # run all tests once
npm run test:watch  # watch mode
npm run typecheck   # tsc -b, no emit
npm run lint        # oxlint
npm run check       # typecheck + lint + test
```

Tests are colocated with the code they cover (`src/**/*.test.ts` and `src/**/*.test.tsx`) and run in jsdom.

## Project structure

```
src/
  core/
    model/      Spreadsheet data model (pure TypeScript, no React/DOM)
    csv/        CSV parse/serialize and sheet conversion
    clipboard/  Range copy/paste helpers (pure TypeScript)
    calc/       Range calculations (sum/average/min/max/count)
    sort/       Row sorting (ascending/descending)
    filter/     Row filtering (view-only, never edits the sheet)
    clean/      Text cleanup (trim/collapse, range-scoped)
    find/       Find & replace (literal, range-scoped)
    dedupe/     Remove duplicate rows (range-scoped)
    xlsx/       XLSX read/write (values only, via exceljs)
    ai/         AI providers, privacy, context, validation, actions
    app.ts      Application metadata and import-format scope
  ui/
    grid/       Presentational grid (range selection, drag, editing, styles)
    toolbar/    Main action buttons (file, clipboard, history, data)
    titlebar/   App title, workbook name, unsaved indicator, window actions
    menubar/    Dropdown menus (File, Edit, View, …)
    formatbar/  Font, color, alignment, number format, borders
    formulabar/ Name box, fx label, editable value bar
    sheet-tabs/ Sheet tabs (add, select, rename, duplicate, delete)
    statusbar/  Sheet size, saved state, selection stats, zoom
    sidebar/    Click-first calculations / AI / properties / styles / help panels
    ai/         AI panel, settings, preview, status
    confirm/    Generic confirmation dialog
    import/     CSV replace confirmation prompt
    filter/     Filter bar (condition, value, active-filter indicator)
    find/       Find & replace bar (query, replacement, case toggle)
    dedupe/     Remove-duplicate-rows confirmation prompt
    state/      UI state reducer, undo/redo history, clipboard, filter, import state
    App.tsx     App shell that wires the reducer to the components
  test/         Shared Vitest setup
  App.tsx       Entry re-export kept from the initial scaffold
  main.tsx      Browser entry point
```

`src/core` is framework-agnostic and has no React or DOM imports, so it can be reused by a future desktop shell and tested with plain unit tests. `src/ui` only presents data; spreadsheet rules live in `src/core`, and the UI's transient state (selection, editing) lives in the `ui/state` reducer.

## Core data model (Phase 2)

Located in `src/core/model`. Public API:

- **Types:** `Workbook`, `Sheet`, `Cell`, `Range`, plus `CellAddress` and `CellValue`.
- **Cells:** `getCell`, `getCellValue`, `hasCell`, `setCellValue`.
- **Rows and columns:** `insertRows`, `deleteRows`, `insertColumns`, `deleteColumns`.
- **Workbooks:** `createWorkbook`, `addSheet`, `getSheet`, `replaceSheet`.
- **Addresses and ranges:** `columnLabel`, `formatCellId`, `createRange`, `rangeContains`, `rangeDimensions`.
- **Input parsing:** `parseCellInput` and `formatCellValue` convert between text and `CellValue`.

Semantics:

- Coordinates are zero-based: row `0`, column `0` is `A1`.
- Storage is sparse: only non-empty cells are kept in `Sheet.cells`.
- Empty cells read as `null` from `getCellValue` and `false` from `hasCell`. The empty string, `0`, and `false` are real values.
- Clearing a cell with `setCellValue(..., null)` removes it. Clearing an already-empty cell returns the same sheet.
- Reads and writes outside the sheet bounds throw `RangeError`; a sheet with zero rows or columns has no accessible cells.
- Every operation is immutable: the input `Sheet`/`Workbook` is never modified, and unchanged writes return the same object.
- Inserting rows/columns shifts cells down/right; deleting removes them and shifts cells up/left. Deletion never creates dangling cells.
- Cell values are `string | number | boolean | null`; `NaN`, `Infinity`, `undefined`, and non-primitives throw `TypeError`.
- Row/column indexes and counts must be safe integers; inserting past the sheet size or deleting beyond it throws `RangeError`.

Not implemented yet: formulas, cell styles, merging, validation, and XLSX.

## Grid UI (Phase 3)

A plain HTML `<table>` grid with no grid library. It renders column/row headers, displays cell values, and supports:

- Range selection: single cell (mouse down or arrow keys), drag to select, and Shift+click/Shift+arrow to extend.
- Editing a cell (double-click or Enter), committing on Enter/blur and cancelling on Escape. Typed text is interpreted by `parseCellInput`.
- Adding and deleting rows and columns from the toolbar. The UI keeps at least one row and one column; the data model itself allows zero.

## CSV import/export (Phase 4)

CSV is parsed and serialized by hand in `src/core/csv` (no library). Import and export work on the current sheet only.

- Import reads a `.csv` file, parses it, and asks for confirmation before replacing the current data.
- Export writes the current sheet as UTF-8 CSV with CRLF line endings, quoting fields that need it.
- Unicode and Arabic text are preserved; commas, quotes, and newlines inside quoted fields are supported.
- Every imported field is stored as text verbatim (no type inference); an empty or missing field becomes an empty cell (`null`).

**What CSV does not preserve:** formulas, number/date formatting, cell styles, charts, images, multiple sheets, and the difference between an empty cell and an empty-string value. Exporting saves a single sheet's values only.

## Undo/Redo (Phase 5)

History is a generic, React-free module (`src/ui/state/history.ts`) that holds immutable `Sheet` snapshots. The reducer pushes a snapshot only when the sheet reference changes, so no-op edits are not recorded.

- Records: cell edits, row/column insertions and deletions, and CSV imports that replace data.
- Does not record: selection, editing drafts, import prompts/errors, or edits that leave the sheet unchanged.
- A new change after undo discards the redo history.
- Undo/redo close the editor; the selection is kept when it is still in bounds, otherwise cleared.
- Toolbar buttons are disabled when nothing is available. Shortcuts: `Ctrl+Z` undo, `Ctrl+Y` or `Ctrl+Shift+Z` redo. They are ignored while typing inside a cell so the browser's text undo works there.
- History limit: **100 snapshots**. Snapshots share unchanged cell objects, so each step costs one map of references plus the changed cells; 100 is conservative for an 8GB-RAM machine. Change `HISTORY_LIMIT` in `src/ui/state/gridState.ts` if sheets grow much larger.

Undo/Redo covers sheet data changes only; it does not restore downloads, window state, or anything outside the current sheet.

## Range selection & copy/paste (Phase 6)

The grid supports single cells and rectangular ranges, with copy/paste built on pure `src/core/clipboard` functions.

- Selection is an `anchor` + `focus` pair; the selected range is the rectangle between them.
- Select with mouse down, extend by dragging or with Shift+click/Shift+arrows; arrows alone move a single-cell selection.
- The focus cell (where typing goes) is marked visually; the whole range is highlighted.
- Copy (`Ctrl+C`) stores the selected range as a block of `CellValue`s in an internal clipboard; copying does not touch undo history.
- Paste (`Ctrl+V`) writes the block anchored at the range's top-left, overwriting existing cells and recording a single undo step.
- Paste size rules: the block is written as-is (never stretched to fill the target range); it is clipped at the sheet's right/bottom edges, so pasting beyond bounds only writes the in-bounds portion.
- Copy/paste preserves value types (numbers stay numbers, booleans stay booleans) and clears cells that are empty in the block.
- There is no OS clipboard integration yet; copy/paste works within the app.

Not implemented yet: sort, filter, formulas, XLSX, search/replace, and multi-sheet work.

## Visible calculations (Phase 7)

A `Calculate` group in the toolbar runs non-destructive calculations over the current selection. Logic lives in pure `src/core/calc`.

- Operations: `Sum`, `Average`, `Minimum`, `Maximum`, `Count`.
- They only read the selected range and never change cell values, the selection, or undo history.
- `Count` counts numeric cells only (not non-empty cells).
- Text, booleans, and empty cells are ignored by the numeric operations.
- When the range has no numeric values, Sum/Average/Minimum/Maximum show `No numeric values in selection`; Count shows `0`.
- The result is shown in a status line and clears when the selection or data changes.

## Sort (Phase 8)

`Sort ascending` and `Sort descending` buttons sort rows by the column of the active cell (`focus`). Logic lives in pure `src/core/sort`.

- With a single-cell selection, the whole sheet is sorted by that column.
- With a range selected, only the range's rows are reordered; rows outside stay put.
- Rows move as whole units, so no data is mixed across columns.
- Numbers sort numerically; text sorts alphabetically; empty cells always go last (both directions); mixed values order numbers before text when ascending, and reverse when descending.
- Sorting is recorded in Undo/Redo and never changes the row or column count.
- Sorting an already-sorted range is a no-op (no history entry).
- The selection keeps its coordinates after sorting (its contents change).
- Sorting with no selection shows `Select a cell or range to sort`.

## Filter (Phase 9)

A `Filter` bar targets the column of the active cell (`focus`). Filtering is a view-only concern: it is not stored in `Sheet`, never deletes or reorders rows, and is not recorded in Undo/Redo.

- Conditions: equals, does not equal, contains, does not contain, is empty, is not empty.
- Numeric comparisons: greater than, greater than or equal, less than, less than or equal.
- Only matching rows are rendered; their original row numbers are kept. The underlying `Sheet` stays complete.
- Text comparisons use the cell's display text (so the number `42` matches `"42"`), exactly and case-sensitively; empty cells never match text or numeric conditions.
- `Is empty` means `null` only; `''`, `0`, and `false` count as non-empty.
- Numeric conditions only match numeric cells; a non-numeric query matches nothing.
- An indicator shows the active column, condition, and `visible of total` rows; `Clear filter` shows all rows again.
- The active filter is independent of selection changes; it stays until cleared.
- Row edits re-evaluate visible rows immediately. Column inserts/deletes and CSV imports clear the filter; undo/redo keeps it when its column still exists.
- Sorting while filtered reorders the whole underlying sheet (including hidden rows); the filter then re-applies to the new order.
- No matching rows shows an empty grid and `0 of N rows`.

## Clean text (Phase 10)

A `Clean text` group applies text cleanup to the selected range only. Logic lives in pure `src/core/clean`.

- Operations: `Trim spaces` (remove leading/trailing spaces and tabs) and `Collapse spaces` (runs of internal spaces/tabs become one space).
- Only strings change; numbers, booleans, empty cells, and already-clean text are untouched.
- The whole cleanup is recorded as a single Undo/Redo step regardless of how many cells changed; a no-op cleanup is not recorded.
- The row/column count and the selection are preserved.
- A status line shows the number of cleaned cells (for example `Cleaned 2 cells`).
- Filtering is respected: cleanup applies to the selected range exactly, so hidden rows are modified only when they fall inside that range.
- No case conversion (uppercase/lowercase) is offered, since it could change data meaning.

## Find & replace (Phase 11)

A `Find and replace` bar searches and replaces within the selected range only. Logic lives in pure `src/core/find`.

- Options: `Find next`, `Replace current`, and `Replace all`.
- Search is literal (no regular expressions), case-sensitive by default with a clear toggle.
- Search matches the cell's displayed text, so numbers and booleans are findable by their text; empty cells are never matched.
- Replacement is text-only: it never modifies numbers, booleans, or empty cells.
- `Replace current` replaces the first occurrence in the active cell and records one undo step.
- `Replace all` replaces every occurrence in the range and records a single undo step.
- A search or replace that changes nothing is not recorded.
- A status line shows the match position and the number of replaced cells.
- Filtering is respected: the search/replace operates on the selected range (the scope), so hidden rows are only touched when they fall inside it.

## Remove duplicate rows (Phase 12)

A `Remove duplicate rows` action removes duplicate full rows within the selected range. Logic lives in pure `src/core/dedupe`.

- The comparison key is built from every column of the selected range; the first occurrence is kept and later duplicates are removed.
- Values are compared with their types: number `1` differs from text `"1"`, empty cells (`null`) are equal to each other, and booleans compare as booleans.
- Row order and the column count are preserved; only duplicate rows are removed (never individual cell values).
- The whole removal is recorded as a single Undo/Redo step; a no-op removal is not recorded.
- A single-row range, no selection, or an already-unique range shows a clear message and changes nothing.
- The selection is kept where possible after rows are removed.

**Filter policy:** removing rows while a filter is active is blocked with `Clear the filter before removing duplicates`, because hidden rows must never be deleted silently.

## Data-loss protection (Phase 13)

Data lives in memory only; **exporting CSV is the current way to save**. The app tracks an unsaved-changes (`dirty`) state.

- Any data change (cell edit, paste, row/column add/delete, CSV import, sort, clean, find/replace, dedupe) marks the sheet dirty. Selection, find-only, filtering, and non-destructive calculations do not.
- A successful CSV export resets the sheet to saved; the status bar shows `Unsaved changes` while dirty.
- CSV import still asks for confirmation before replacing data.
- Large destructive operations ask for confirmation: removing **5 or more** duplicate rows shows a prompt; single row/column deletions and small removals stay unconfirmed.
- A standard browser `beforeunload` warning is requested while dirty (the browser shows its own standard message).
- No persistence, database, or user accounts are added; no `LocalStorage` is used.

## XLSX (Phase 14)

XLSX is read and written with `exceljs` (MIT), loaded dynamically so it stays out of the initial bundle. Logic lives in pure `src/core/xlsx`.

- Import reads the **first worksheet only**; export writes a **single worksheet**.
- Cell values map to `string` / `number` / `boolean` / `null`. Dates are imported as ISO strings; formulas are imported as their text (never evaluated).
- Formula engines, styles, charts, images, merges, frozen panes, and macros are **not** supported or preserved.
- Import uses the existing replace-data confirmation; a corrupt or unsupported file shows a clear error.
- Trailing empty rows/columns are not stored by XLSX, so they are not preserved on export.

## Desktop-style UI (Phase 16)

The dark layout follows desktop spreadsheet conventions with sheetly's own theme: title bar (brand, workbook name, active-sheet chip, saved state, Save CSV / Save XLSX), menu bar (File, Edit, View, Insert, Sheet, Data, Calculate, Help), icon toolbar, format bar, formula bar (name box, fx, cancel/confirm, editable value), grid, sheet tabs with navigation, status bar, and a calculations sidebar. No assets or code from LibreOffice/Excel are used, and the app stays a web app (no Tauri yet).

- The **Click-First Calculations** sidebar is open by default: Sum, Average, Count, Min, and Max cards run on the selected range.
- Menus contain real commands; items that are not implemented are disabled and labelled `Deferred`.
- The format bar applies font family/size, bold/italic/underline/strikethrough, text and fill colors, horizontal alignment, number format, decimals via `# $ %`, borders, and includes a disabled merge control. Formatting is kept separate from `CellValue`, is session-only, is **not** part of Undo/Redo, and is **not** saved to CSV or XLSX.
- Multiple sheets can be added, selected, renamed (double-click a tab), duplicated, and deleted (with confirmation). CSV/XLSX still handle the active sheet only. Undo history is per active sheet and resets when switching sheets.
- The filter and find bars are collapsed by default and open from the toolbar or menus.
- The status bar shows the sheet position, selection size, last operation, selection Average/Sum/Count, and zoom.
- The grid starts at 30 rows × 12 columns on a sheet named `Quarterly Sales`; no sample data is seeded (the reference screenshot's rows are demo content).
- Window controls are limited to real browser actions (fullscreen); there are no fake minimize/maximize/close buttons.

## AI assistance

Sheetly AI is inside the right Sidebar and is **local-only** in the current product. It is opt-in and disabled by default with a "not ready" message. No cloud providers, API keys, or network requests are exposed. Only the selected range is sent when enabled in future phases; every mutation goes through preview/apply with validation and undo. No Ollama installer or model downloader is included yet.

## Scope

**MVP target:** CSV import/export, grid editing, row/column operations, copy/paste, undo/redo, visible calculations (sum, average, min, max, count), sort, filter, deduplicate, text cleanup, find/replace, clear errors, and data-loss protection.

**Deferred:** XLSX (pending a license/performance check), Tauri desktop shell, formula engine, macros, collaboration, cloud sync, accounts, AI features, and mobile.

## Contributing

Keep changes small and focused. Before opening a change, run `npm run check` and `npm run build`, and follow the rules in [AGENTS.md](./AGENTS.md).

## License

Not chosen yet. Only free and open-source dependencies with clear licenses are used.
