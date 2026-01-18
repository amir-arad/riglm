/**
 * CLI Exit Codes
 *
 * Standard exit codes for CLI operations.
 * @see docs/cli-design.md for specification
 */

export const ExitCode = {
  /** Successful execution */
  SUCCESS: 0,
  /** Invalid configuration (parse error, schema violation) */
  INVALID_CONFIG: 1,
  /** Configuration file not found */
  CONFIG_NOT_FOUND: 2,
  /** Warnings present (with --strict mode) */
  WARNINGS_STRICT: 3,
  /** General runtime error */
  RUNTIME_ERROR: 4,
} as const;

export type ExitCode = (typeof ExitCode)[keyof typeof ExitCode];

/**
 * Exit the process with a specific code
 */
export function exit(code: ExitCode): never {
  process.exit(code);
}
