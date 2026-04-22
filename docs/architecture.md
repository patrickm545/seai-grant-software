# Architecture

## Public flow
1. Homeowner visits installer website.
2. Embedded form posts to `/api/intake`.
3. Rules-based checks run immediately.
4. AI enhances the eligibility summary when an API key is configured.
5. Lead is stored and marked `READY_TO_APPLY` or `NEEDS_REVIEW`.

## Admin flow
1. Admin reviews the lead in `/admin`.
2. Supporting documents can be parsed through `/api/ai/document-extract`.
3. Admin exports the submission package.
4. Homeowner reviews and approves.
5. A human completes the final portal submission.

## Safe automation stance
Use browser automation only after:
- homeowner consent is captured
- submitted fields are frozen in an audit log
- SEAI terms and your DPA/GDPR process have been reviewed
