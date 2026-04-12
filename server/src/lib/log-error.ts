/** Log an error message safely without leaking raw objects or stack traces. */
export function logError(context: string, error: unknown): void {
  const msg = error instanceof Error ? error.message : String(error);
  console.error(`${context}: ${msg}`);
}
