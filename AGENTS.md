# AGENTS.md - sheetly

## Project goal
Build an open-source spreadsheet app from scratch, inspired by spreadsheet apps, with our own ideas. Not a copy of Microsoft Excel or LibreOffice. LibreOffice is used only as a behavioral/technical reference during exploration.

## Current status
React/Vite/TypeScript shell, the pure spreadsheet model in `src/core/model`, light/dark themes with i18n (English/Arabic), multi-sheet editing, per-range cell formatting, a plain-HTML grid, single-sheet CSV import/export in `src/core/csv`, single-sheet XLSX import/export in `src/core/xlsx` (via exceljs), bounded undo/redo, range copy/paste, visible calculations in `src/core/calc` shown above the grid, ascending/descending sort in `src/core/sort`, view-only filtering in `src/core/filter`, range-scoped text cleanup in `src/core/clean`, literal find/replace in `src/core/find`, range-scoped duplicate-row removal in `src/core/dedupe`, data-loss protection, and Sheetly AI (local-only placeholder) in the right Sidebar.
No formula engine, cloud sync, or Tauri yet. Do not start those phases without an explicit request.

## Tech stack
- TypeScript (strict)
- React + React DOM
- Vite
- Vitest + jsdom + @testing-library/react + @testing-library/jest-dom

Tauri is deferred to a later phase.

## Architecture principles
- Separate `src/core` (pure data/model/operations logic) from `src/ui` (React components)
- Keep business logic framework-agnostic where possible
- `src/core` must not import React, touch the DOM, or use browser APIs, so tests stay fast and portable
- `src/ui` holds presentation and interaction only; no spreadsheet rules or parsing
- Prefer simple, readable code over clever abstractions
- Click-first UX for non-technical users
- Free and open-source dependencies with clear licenses only

## Project structure
```
src/
  core/
    model/      Spreadsheet data model (pure TypeScript)
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
    app.ts      App metadata and import-format scope
  ui/
    grid/       Presentational grid (range selection, drag, editing, styles)
    toolbar/    Icon action bar (file, clipboard, history, data)
    titlebar/   App title, workbook/sheet names, saved state, save actions
    menubar/    Dropdown menus (File, Edit, View, Insert, Sheet, Data, Calculate, Help)
    formatbar/  Font, color, alignment, number format, borders
    formulabar/ Name box, fx label, cancel/confirm, editable value bar
    sheet-tabs/ Sheet tabs with navigation (add, select, rename)
    statusbar/  Sheet position, selection size, last action, stats, zoom
    sidebar/    Click-first calculations / AI / properties / styles / help panels
    ai/         AI panel, settings, preview, status
    confirm/    Generic confirmation dialog
    import/     CSV replace confirmation prompt
    filter/     Filter bar (condition, value, active-filter indicator)
    find/       Find & replace bar (query, replacement, case toggle)
    dedupe/     Remove-duplicate-rows confirmation prompt
    state/      UI state reducer, undo/redo history, clipboard, filter, import state
    App.tsx     App shell wiring the reducer to the components
  test/     Test setup shared by Vitest
```
Tests live next to the module they cover as `*.test.ts` / `*.test.tsx`.

## UI layer rules
- The grid is a plain `<table>`; do not add a grid library without first explaining the need, checking its license, and assessing size/performance on an 8GB-RAM machine.
- Keep spreadsheet rules out of components: parsing, validation, and data mutation stay in `src/core`.
- UI-only transient state (selection, editing, current draft) lives in the `ui/state` reducer; presentational components stay dumb.

## Data model rules (enforced in `src/core/model`)
- Coordinates are zero-based; cell IDs use one-based rows (`formatCellId(0, 0) === 'A1'`).
- Storage is sparse: only non-empty cells exist in `Sheet.cells`.
- An empty cell reads as `null`; `''`, `0`, and `false` are real values.
- Clearing uses `setCellValue(sheet, row, column, null)`; empty writes return the same sheet.
- Out-of-bounds reads and writes throw `RangeError`; counts and indexes must be safe integers.
- All sheet/workbook operations are immutable and must never mutate their input.
- Row/column insertion and deletion must shift existing cells consistently and drop deleted cells.
- Cell values are `string | number | boolean | null`; reject `NaN`, `Infinity`, `undefined`, and objects.
- Any data-model change needs unit tests for the normal path and its edge cases.

## CSV rules (enforced in `src/core/csv`)
- CSV parsing and serialization live in `src/core/csv`; never inside React components.
- Import stores every field as a string verbatim (no type inference); empty or missing fields become empty cells (`null`).
- Export writes a single sheet's values only, as UTF-8 CSV; it does not save formulas, styles, charts, or multiple sheets.
- File reading and the download are browser glue in `src/ui` and call the core parser/serializer.
- Import must warn before replacing current data.
- Unicode/Arabic, quoted commas/quotes/newlines, blank lines, missing values, and ragged rows are supported.

## Undo/Redo rules (enforced in `src/ui/state`)
- History is a React-free module (`history.ts`) storing immutable `Sheet` snapshots; do not add inverse-command logic that duplicates the model.
- Record only data changes: cell edits, row/column insert/delete, and CSV imports. Never record selection, drafts, prompts, or no-op operations.
- Pushing a new change after undo must clear the redo stack.
- Keep history bounded (`HISTORY_LIMIT = 100` in `gridState.ts`); re-evaluate if sheets grow much larger.
- Undo/redo close the editor and clamp or clear the selection to stay in bounds.
- Disable Undo/Redo buttons when unavailable; support `Ctrl+Z` / `Ctrl+Y` (`Ctrl+Shift+Z`) without hijacking typing in inputs.
- Any history behavior change needs reducer tests plus UI tests for the buttons and shortcuts.

## Range & copy/paste rules (enforced in `src/core/clipboard` and `src/ui/state`)
- Selection is an `anchor`/`focus` pair; the active cell (the one typed into) is `focus`.
- Copy reads the selected range into a `CellBlock`; copy never records history.
- Paste writes the block anchored at the selection's top-left, clipped to the sheet bounds; it records a single undo step.
- Paste does not stretch the block to the target range; a smaller block only fills its own top-left area, a larger block is clipped.
- Copy/paste preserve `CellValue` types; empty cells are `null` and clear their target on paste.
- Never add OS-clipboard or cross-app copy/paste without an explicit request.
- Any range/copy/paste change needs core tests plus reducer and grid interaction tests.

## Visible calculations rules (enforced in `src/core/calc`)
- Calculation logic lives in `src/core/calc` and never in React components.
- Calculations read the current selection only and are non-destructive: no cell, selection, or undo-history change.
- `Count` counts numeric cells only; do not add a non-empty count without an explicit request.
- Ignore empty cells, text, and booleans in numeric operations.
- When no numeric values exist, Sum/Average/Min/Max report a clear "no numeric values" state instead of a misleading result.
- The displayed result must clear when the selection or data changes.
- Any calculation change needs core tests covering numbers, mixed/empty ranges, and non-destructiveness.

## Sort rules (enforced in `src/core/sort`)
- Sort logic lives in `src/core/sort`; the key column is the active cell's (`focus`) column.
- A single-cell selection sorts the whole sheet; a range selection sorts only that range's rows.
- Rows move as whole units; never reorder individual cells or mix columns.
- Numbers sort numerically, text alphabetically, empty cells last (both directions), and mixed values follow the documented number-before-text rule.
- Sort is a reorder only: it records one undo step and never changes row/column counts.
- Never mutate the input; copy the row order and build a new sheet.
- Sorting an already-sorted range returns the same sheet and must not record history.
- Show a clear message when there is no selection/column to sort.
- Any sort change needs core tests plus reducer tests for undo/redo and no-op cases.

## Filter rules (enforced in `src/core/filter`)
- Filtering is view-only state in `src/ui/state`; `Sheet` is never changed, and filter actions never touch Undo/Redo history.
- The filter targets the active cell's (`focus`) column; keep one active filter and let it survive selection changes until cleared.
- Support: equals, not-equals, contains, not-contains, empty, not-empty, greater/less than (and or-equal).
- Text conditions compare display text exactly and case-sensitively; empty cells only match the empty/not-empty conditions.
- Numeric conditions only match numeric cells; a non-numeric query matches nothing.
- Never reorder or delete rows for filtering; render only matching row indices, keeping original row numbers.
- Recompute visible rows from the current sheet on every render so data edits are reflected immediately.
- Clear the filter on column inserts/deletes and CSV imports; sanitize it after undo/redo if its column disappears.
- Any filter change needs core tests plus reducer and UI tests, including no-match and clear-filter cases.

## Clean text rules (enforced in `src/core/clean`)
- Cleanup logic lives in `src/core/clean` and applies only to the selected range.
- Only strings change; never touch numbers, booleans, empty cells, or already-clean text.
- Offer only trim (leading/trailing spaces/tabs) and collapse (internal runs of spaces/tabs); do not add uppercase/lowercase conversion.
- Record the whole cleanup as a single Undo/Redo step, and do not record a no-op cleanup.
- Preserve the selection and never change the row/column count.
- Respect the active filter: clean the selected range exactly, modifying hidden rows only when they fall inside it.
- Show a clear result message with the number of cleaned cells.
- Any cleanup change needs core tests plus reducer and UI tests.

## Find & replace rules (enforced in `src/core/find`)
- Find/replace logic lives in `src/core/find` and operates on the selected range (the search scope).
- Search is literal (no regular expressions), case-sensitive by default with a clear toggle.
- Search matches a cell's displayed text; empty cells are never matched.
- Replacement is text-only: never modify numbers, booleans, or empty cells.
- `Replace current` replaces the first occurrence in the active cell and records one undo step; `Replace all` records a single undo step for the whole range.
- Never record a search or a replace that changes nothing.
- Respect the active filter: operate on the selected range exactly, touching hidden rows only when they fall inside it.
- Show the match position and the number of replaced cells.
- Any find/replace change needs core tests plus reducer and UI tests, including no-op and filter cases.

## Remove duplicate rows rules (enforced in `src/core/dedupe`)
- Dedupe logic lives in `src/core/dedupe` and operates on rows within the selected range, keyed by every column of that range.
- Keep the first occurrence, remove later duplicates, and preserve row order and the column count.
- Compare values with their types: number `1` differs from text `"1"`, `null` equals `null`, booleans compare as booleans.
- Remove whole rows only; never dedupe individual cell values.
- Record the removal as a single Undo/Redo step; do not record a no-op removal.
- A single-row range, no selection, or no duplicates shows a message and changes nothing.
- Block the operation while a filter is active (message: clear the filter first) so hidden rows are never deleted silently.
- Any dedupe change needs core tests plus reducer and UI tests, including number-vs-text and filter cases.

## Data-loss protection rules (enforced in `src/ui/state` and `src/ui`)
- Data is in-memory; exporting CSV is the current save action. Do not add persistence, a database, accounts, or `LocalStorage` without a separate approval.
- Track unsaved changes with the workbook-level `workbookDirty` flag (set by data changes, cleared only by a successful export); `savedSheet` still tracks the active sheet snapshot.
- Only data changes mark the sheet dirty; selection, find-only, filtering, and non-destructive calculations do not.
- Show a clear `Unsaved changes` indicator while dirty.
- Confirm large destructive operations (removing `DEDUPE_CONFIRM_THRESHOLD = 5` or more duplicate rows); keep small operations unconfirmed.
- Request a standard `beforeunload` prompt while dirty, without custom message text.
- Any protection change needs reducer and UI tests, including indicator, beforeunload, and confirm/cancel cases.

## XLSX rules (enforced in `src/core/xlsx`)
- Use exceljs (MIT) only; load it dynamically so it stays out of the initial bundle.
- Import the first worksheet only; export a single worksheet.
- Map values to `string | number | boolean | null`; import dates as ISO strings and formulas as text (never evaluate or run them).
- Never claim to preserve styles, charts, images, merges, frozen panes, or macros; do not run any code from an XLSX file.
- Reuse the existing replace-data confirmation, mark the sheet dirty after import, and reset to saved only after a successful XLSX export.
- Show a clear error for corrupt or unsupported files.
- Any XLSX change needs core tests (pure conversion and a node-env exceljs round-trip) plus reducer tests for the import flow.

## Desktop UI rules (enforced in `src/ui`)
- The responsive layout is title bar (brand, workbook name, active-sheet chip, saved state), menu bar (File, Edit, View, Insert, Sheet, Data, Calculate, Help), editing toolbar with Sheetly AI access, format bar, formula bar, single-operation calculation result strip, grid, optional sidebar, sheet tabs, and status bar; File contains New, Print, CSV, and XLSX actions. Keep Sheetly's semantic light/dark theme and never copy LibreOffice/Excel assets.
- Every visible menu command and toolbar button must work or be disabled with a clear `Deferred` hint; do not add fake window buttons (minimize/maximize/close).
- Calculations run only when the user explicitly selects one operation; show only that result above the grid, never automatic statistics in the status bar. Clear the result after selection, data, or active-sheet changes.
- Printing calls `window.print()` and uses print CSS to hide application controls while retaining workbook/sheet names and the active sheet's visible grid.
- Sheetly AI is available from the toolbar and Sidebar but remains local-only, opt-in, and unavailable until a local provider is configured; do not add cloud AI, telemetry, an installer, or a model downloader.
- The filter and find bars are collapsed by default (`bar-slot is-collapsed`); open them from the toolbar or View menu, and keep `Ctrl+F` focusing the find input.
- Cell formatting is a presentation-only `CellStyle` kept separate from `CellValue`; it is session-only, not part of Undo/Redo, and not saved to CSV/XLSX. Do not claim otherwise.
- Multi-sheet state lives in `sheetStore` + `sheetOrder`, kept in sync with the active sheet by the public `gridReducer`; each sheet keeps its own styles in `stylesBySheet`.
- Switching sheets resets the active sheet's undo history (documented limitation) and keeps other sheets' content.
- The formula bar commits on Enter (or the confirm button) and reverts on Escape (or the cancel button); it must never hijack typing inside the cell editor.
- The status bar shows sheet position, selection, operation feedback, saved state, and zoom; zoom is session-local and no calculation statistics appear there.
- The initial sheet is `Quarterly Sales` at 30 rows × 12 columns; no sample data is seeded. Grid constants live in `ui/config.ts`.
- New UI behavior needs a Testing Library test; keep `Ctrl+Z/Y`, `Ctrl+C/V/X`, `Ctrl+F`, Enter, Escape, arrows, Shift+arrows, and Delete working without breaking cell editing.

## AI rules (enforced in `src/core/ai` and `src/ui/ai`)
- Sheetly AI is inside the right Sidebar and is local-only in the current product. No cloud providers, API keys, or network requests are exposed.
- AI is opt-in and defaults to disabled with a translated not-ready message. No Ollama installer, model downloader, or setup wizard in this phase.
- No project backend and no telemetry. Core AI must not import React or the DOM.
- Only the selected range may be sent when enabled; hidden rows excluded with a warning. Never send the whole workbook, file paths, or config.
- Model output is untrusted: validation rejects invalid JSON, unknown actions, out-of-range targets, and network/command intent. Allowed actions are only `calculate`, `clean_text`, `sort`, `filter`, `find_replace`, `remove_duplicates`.
- Every mutation goes Preview → Apply with validation and a single Undo entry for data changes. Never apply directly from a model response.
- Any AI change needs core unit tests and UI tests.

## Conventions
- No semicolons, single quotes, and an explicit `import type` for type-only imports
- Keep components small and presentational until a data model exists
- Never add `any` to silence errors; fix the type
- New behavior in `core` needs a unit test; new UI behavior needs a Testing Library test

## Commands
- `npm install` - Install dependencies (once, or after dependency changes)
- `npm run dev` - Start dev server
- `npm run build` - Type-check and build for production
- `npm run preview` - Preview production build
- `npm run typecheck` - Type-check only (`tsc -b`)
- `npm run lint` - Run oxlint
- `npm run test` - Run tests (once)
- `npm run test:watch` - Run tests in watch mode
- `npm run check` - Type-check, lint, and test in one go

## Definition of done
Before reporting a task complete, run:
1. `npm run typecheck`
2. `npm run lint`
3. `npm run test`
4. `npm run build` (for anything that affects the app bundle)

Report the exact commands and real results. Do not claim success without running them.

## Dependency policy
- Only free and open-source dependencies with a clear license (MIT, Apache-2.0, BSD, ISC, MPL-2.0)
- Check the license before adding anything; note why the dependency is needed
- No XLSX library until its license, maintenance, and performance are vetted
- No Tauri, cloud sync, or paid API dependencies in this phase

## Reference policy
LibreOffice/Excel may be inspected for behavior and technical understanding only. Never copy their source code, assets, icons, or distinctive visual design into this project.

## MVP scope (current)
CSV import/export, basic grid editing, row/column operations, copy/paste, Undo/Redo, visible operations (Sum/Average/Min/Max/Count), sort, filter, deduplicate, text cleanup, find/replace, clear errors, data-loss protection.

## Out of scope (for now)
VBA/macros, full Excel compatibility, real-time collaboration, cloud sync, user accounts, paid APIs, full formula engine, full web app multi-user, mobile, XLSX styles/multi-sheet, a full formula/AI code-execution engine (AI only produces validated action plans).
