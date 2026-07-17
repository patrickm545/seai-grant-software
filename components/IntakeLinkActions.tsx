'use client';

import Link from 'next/link';
import { useState } from 'react';

export function IntakeLinkActions({ intakePath }: { intakePath: string }) {
  const [copied, setCopied] = useState(false);

  async function copyIntakeLink() {
    const intakeUrl = new URL(intakePath, window.location.origin).toString();
    try {
      await navigator.clipboard.writeText(intakeUrl);
    } catch {
      const textarea = document.createElement('textarea');
      textarea.value = intakeUrl;
      textarea.style.position = 'fixed';
      textarea.style.opacity = '0';
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
    }
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1800);
  }

  return (
    <div className="dashboard-empty-actions">
      <Link href={intakePath} className="installer-add-button">Open intake form</Link>
      <button type="button" className="dashboard-secondary-button" onClick={copyIntakeLink}>
        {copied ? 'Intake link copied' : 'Copy intake link'}
      </button>
    </div>
  );
}
