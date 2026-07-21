import { classifySolarGrantJurisdiction } from './solargrant-jurisdiction';

export type SolarGrantJurisdictionAuditFact = {
  organisationId: string;
  county: string | null;
  eircode: string | null;
};

export function aggregateSolarGrantJurisdictionFacts(facts: readonly SolarGrantJurisdictionAuditFact[]) {
  const counts = new Map<string, {
    organisationId: string;
    jurisdiction: string;
    reason: string;
    count: number;
  }>();

  for (const fact of facts) {
    const classification = classifySolarGrantJurisdiction(fact);
    const key = `${fact.organisationId}|${classification.jurisdiction}|${classification.reason}`;
    const current = counts.get(key);
    if (current) current.count += 1;
    else {
      counts.set(key, {
        organisationId: fact.organisationId,
        jurisdiction: classification.jurisdiction,
        reason: classification.reason,
        count: 1
      });
    }
  }

  return [...counts.values()].sort((a, b) =>
    a.organisationId.localeCompare(b.organisationId) ||
    a.jurisdiction.localeCompare(b.jurisdiction) ||
    a.reason.localeCompare(b.reason)
  );
}
