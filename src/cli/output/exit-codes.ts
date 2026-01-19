export const ExitCode = {
  SUCCESS: 0,

  INVALID_CONFIG: 1,

  CONFIG_NOT_FOUND: 2,

  WARNINGS_STRICT: 3,

  RUNTIME_ERROR: 4,
} as const;

// eslint-disable-next-line no-redeclare
export type ExitCode = (typeof ExitCode)[keyof typeof ExitCode];

export function exit(code: ExitCode): never {
  process.exit(code);
}
