import { notFound } from 'next/navigation';
import { buildApplicationPack } from '@/lib/application-pack';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export default async function PrintApplicationPackPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const lead = await prisma.lead.findUnique({
    where: { id },
    include: {
      installer: true,
      documents: {
        orderBy: { createdAt: 'desc' }
      }
    }
  });

  if (!lead) return notFound();

  const pack = buildApplicationPack(lead);

  return (
    <main className="print-pack-page">
      <section className="print-pack-header">
        <div>
          <div className="print-pack-kicker">SEAI manual submission prep</div>
          <h1>Application Pack</h1>
          <p>{pack.applicantName}</p>
        </div>
        <div>
          <strong>{pack.readinessLabel}</strong>
          <p>Generated {new Date(pack.generatedAt).toLocaleString('en-IE')}</p>
        </div>
      </section>

      <section className="print-pack-notice">
        <p>{pack.manualAssistNotice}</p>
      </section>

      <section className="print-pack-section">
        <h2>Submission Readiness Checklist</h2>
        <table>
          <tbody>
            {pack.checklist.map((item) => (
              <tr key={item.id}>
                <th>{item.label}</th>
                <td>{item.complete ? 'Complete' : item.missingMessage}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      {pack.sections.map((section) => (
        <section key={section.id} className="print-pack-section">
          <h2>{section.title}</h2>
          <table>
            <tbody>
              {section.fields.map((field) => (
                <tr key={`${section.id}-${field.label}`}>
                  <th>{field.label}</th>
                  <td>{field.value}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      ))}
    </main>
  );
}
