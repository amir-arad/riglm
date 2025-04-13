Here's a token-efficient summary of the Node.js v23.11.0 SQLite documentation, suitable for a small-context LLM:

### SQLite Module (Node.js v23.11.0)

- **Import:** `import sqlite from 'node:sqlite'` (ESM)

#### Classes & Methods:

**DatabaseSync**
- `new DatabaseSync(path, options)`
  - `path`: DB path (file or `':memory:'`)
  - `options`: 
    - `open`: auto-open (default: true)
    - `readOnly`: read-only mode (default: false)
    - `enableForeignKeyConstraints`: FK constraints (default: true)
    - `enableDoubleQuotedStringLiterals`: compatibility mode (default: false)
    - `allowExtension`: load extensions (default: false)
- Methods:
  - `.exec(sql)` – execute SQL statements.
  - `.prepare(sql)` → `StatementSync`
  - `.function(name, options, function)` – create user-defined SQLite functions.
  - `.close()` – close connection.
  - `.open()` – open DB if not auto-opened.
  - `.isOpen` – boolean indicating open state.
  - `.loadExtension(path)` – load SQLite extension (requires `allowExtension: true`).
  - `.enableLoadExtension(allow)` – toggle extension loading.
  - `.createSession(options)` → `Session` (track DB changes).
  - `.applyChangeset(changeset, options)` – apply binary changeset.
  - `[Symbol.dispose]()` – experimental; close connection safely.

**Session** (for tracking DB changes)
- `.changeset()` – returns binary changeset.
- `.patchset()` – returns compact binary changeset.
- `.close()` – closes session.

**StatementSync** (Prepared Statements)
- Methods:
  - `.run(params)` – executes, returns `{changes, lastInsertRowid}`.
  - `.all(params)` – executes, returns array of rows.
  - `.get(params)` – executes, returns first row.
  - `.iterate(params)` – returns iterator over rows.
  - `.columns()` – info about statement columns.
- Config:
  - `.setReadBigInts(bool)` – enables BigInt for large integers.
  - `.setAllowBareNamedParameters(bool)` – simplifies parameter binding.
  - `.setAllowUnknownNamedParameters(bool)` – ignores unknown parameters.
- Properties:
  - `.sourceSQL` – original SQL.
  - `.expandedSQL` – SQL with bound parameters.

#### SQLite Constants:
- For conflict resolution: `SQLITE_CHANGESET_DATA`, `SQLITE_CHANGESET_NOTFOUND`, `SQLITE_CHANGESET_CONFLICT`, `SQLITE_CHANGESET_CONSTRAINT`, `SQLITE_CHANGESET_FOREIGN_KEY`.
- For handling conflicts: `SQLITE_CHANGESET_OMIT`, `SQLITE_CHANGESET_REPLACE`, `SQLITE_CHANGESET_ABORT`.

#### Data Type Conversion:
| SQLite Type | JavaScript Type            |
| ----------- | -------------------------- |
| `NULL`      | `null`                     |
| `INTEGER`   | `number` or `bigint`       |
| `REAL`      | `number`                   |
| `TEXT`      | `string`                   |
| `BLOB`      | `TypedArray` or `DataView` |

#### SQLite Backup:
- `sqlite.backup(sourceDb, path, options)` creates DB backup with optional progress callbacks.

This format captures essential details clearly and concisely for effective use in LLM prompts with limited context windows.