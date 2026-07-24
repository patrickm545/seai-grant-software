export const SUBMISSION_PACKAGE_FILENAME = 'solargrant-application-pack.json';

export function buildSubmissionPackageDownload(payload: unknown) {
  return new Response(JSON.stringify(payload, null, 2), {
    status: 200,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Content-Disposition': `attachment; filename="${SUBMISSION_PACKAGE_FILENAME}"`,
      'X-Content-Type-Options': 'nosniff'
    }
  });
}
