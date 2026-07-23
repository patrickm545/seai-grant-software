export type MigrationPreflightState = 'up-to-date' | 'pending';

export function evaluateMigrationPreflight(status: number, output: string): MigrationPreflightState {
  const divergentHistory =
    /local migration history and the migrations table from your database are different/i.test(output) ||
    /migration(?:s)? from the database (?:are|is) not found locally/i.test(output);
  const failed =
    /failed migration/i.test(output) ||
    /migration(?:s)? have failed/i.test(output) ||
    /failed to apply/i.test(output);

  if (divergentHistory || failed) {
    throw new Error('Migration history is divergent or contains a failed migration.');
  }
  if (status === 0) return 'up-to-date';

  const pending = /have not yet been applied|pending migration/i.test(output);
  if (status === 1 && pending) return 'pending';

  throw new Error('Migration status could not prove an up-to-date or safe pending state.');
}
