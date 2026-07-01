# Security and GDPR

## Purpose

Clada OS handles business and customer information, so trust must be treated as a core product requirement.

## Rules

- Do not commit private environment values.
- Use environment variables for sensitive configuration.
- Keep customer data collection limited to information that supports the workflow.
- Avoid collecting unnecessary sensitive information.
- Make data handling clear to business users and customers.
- Protect business-only areas.
- Treat production data carefully during debugging.

## GDPR principles

- Collect only what is needed.
- Explain why customer information is requested.
- Store information securely.
- Restrict access to users who need it.
- Allow future deletion and export workflows to be added.
- Keep auditability in mind for important business actions.

## Product implications

Forms should ask for practical sales and workflow information, not excessive personal data.

Customer portals and upload features should be designed with privacy, access control, and clear consent in mind.

## Sprint requirement

Any sprint that changes login, customer data, forms, uploads, business access, or storage must mention security and GDPR impact in the sprint notes.
