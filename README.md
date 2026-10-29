# Sheetly

Sheetly is an open-source browser spreadsheet built from scratch with React, TypeScript, and Vite. It combines an immutable spreadsheet core with a plain HTML grid, multi-sheet editing, CSV/XLSX workflows, data-cleaning tools, and optional local AI assistance.

> Active development: Sheetly is not a full Excel-compatible replacement. It has no formula engine, cloud sync, accounts, collaboration, or Tauri desktop shell.

## Features

- Plain HTML grid with cell/range selection, keyboard navigation, editing, row/column operations, and a formula/value bar.
- Multiple sheets: add, select, rename, duplicate, and delete.
- CSV import/export and XLSX import/export for the active sheet.
- Bounded per-sheet undo/redo, typed range copy/paste, dirty-state protection, and browser printing.
- Sum, average, minimum, maximum, numeric count, sorting, view-only filtering, text cleanup, literal find/replace, and duplicate-row removal.
- Session-only cell formatting: fonts, colors, alignment, number formats, decimals, and borders.
- English/Arabic localization with live LTR/RTL switching, light/dark themes, and responsive layout.
- Optional Sheetly AI backed by a local Ollama endpoint; selected data is bounded and plans are validated before preview/apply.

## File behavior

Cell values are string, number, boolean, or null and live in memory. CSV and XLSX operate on the active sheet only. CSV imports fields as text without type inference. XLSX imports the first worksheet and exports one worksheet; dates become ISO strings and formulas remain unevaluated text.

Formats do not preserve formulas, styles, charts, images, merges, frozen panes, macros, or multiple worksheets. Cell formatting is session-only and is not written to CSV or XLSX. Workbook data is not stored in localStorage.

## Tech stack and setup

React 19, TypeScript 6 strict mode, Vite 8, Vitest 5, jsdom, Testing Library, jest-dom, oxlint, and ExcelJS 4.4.

Requirements: Node.js 20.19+ (or 22.12+) and npm 10+.

    npm install
    npm run dev

The development server is configured for http://localhost:3000 and listens on 0.0.0.0. No environment variables are required for standard operation; .env.example documents this.

    npm run build       # type-check and create dist/
    npm run preview     # preview the production build
    npm run typecheck   # tsc -b, no emit
    npm run lint        # oxlint
    npm run test        # run Vitest once
    npm run test:watch  # watch mode
    npm run check       # typecheck + lint + test

## Repository layout

    src/core/model       workbook, sheet, cell, address, and style model
    src/core/csv         CSV parsing and serialization
    src/core/xlsx        ExcelJS conversion and I/O
    src/core/clipboard   typed range copy/paste
    src/core/calc        numeric range calculations
    src/core/sort        row sorting
    src/core/filter      view-only row matching
    src/core/clean       trim/collapse string cleanup
    src/core/find        literal find/replace
    src/core/dedupe      whole-row deduplication
    src/core/ai          local provider, bounded context, validation, actions
    src/ui/state         reducer, sheets, history, filters, clipboard, styles
    src/ui/grid          plain HTML table grid
    src/ui/*             toolbar, menus, bars, sidebar, dialogs, tabs, i18n
    public/               favicon and SVG symbols

Tests are colocated as *.test.ts and *.test.tsx. Core tests are framework-free; UI tests use Vitest with jsdom and Testing Library.

## Architecture

src/core is the source of truth for spreadsheet rules and must remain independent of React, the DOM, browser APIs, and UI state. Operations are immutable and should preserve identity for no-ops where practical.

src/ui owns interaction state and presentation. src/ui/state/gridState.ts coordinates the active sheet, sheet order, per-sheet history, selection, editing, filters, confirmations, calculation results, notices, styles, and workbook dirty state.

The initial workbook is Untitled 1 with one empty Quarterly Sales sheet containing 30 rows and 12 columns. No sample data is seeded.

## AI and privacy

AI is disabled by default. The implemented provider is local Ollama at http://localhost:11434; non-loopback endpoints are treated as external and can be rejected in strict-local mode. Only the selected range is sent in a bounded context; hidden filtered rows are excluded with a warning.

Model output is untrusted. Allowed plans are calculate, clean text, sort, filter, find/replace, and remove duplicates. Action ranges must remain inside the user selection, and mutating plans go through preview/apply and normal history. There is no cloud provider, backend, telemetry, installer, or model downloader.

Excel and LibreOffice may be consulted for behavior, but their source code, assets, icons, and distinctive visual design are not copied.

## Contributors

- Ahmed Jasim — project author

