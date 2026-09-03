import {
  OPERATION_REPORTING_FAILURE_EXIT,
  runFixedProductionEvidenceOperationWithRetention
} from '../lib/production-evidence-operation-retention';

if (process.argv.length !== 2) {
  console.error('FIXED_LAUNCHER_UNSAFE: this command accepts no arguments.');
  process.exit(1);
}

try {
  const result = runFixedProductionEvidenceOperationWithRetention();
  process.stdout.write(result.stdout);
  process.stderr.write(result.stderr);
  if (result.reportingStatus === 'failed') {
    console.error(
      'OPERATION_REPORTING_FAILED: child output and repository exit were retained before reporting failed.'
    );
  }
  process.exitCode = result.wrapperExit;
} catch (error) {
  console.error(
    error instanceof Error
      ? error.message
      : 'OPERATION_RETENTION_FAILED: unknown failure before the child result was available.'
  );
  process.exitCode = OPERATION_REPORTING_FAILURE_EXIT;
}
