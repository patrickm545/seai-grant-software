import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ApplicationPackView } from '@/components/ApplicationPackView';
import { buildApplicationPack } from '@/lib/application-pack';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export default async function ApplicationPackPage({ params }: { params: Promise<{ id: string }> }) {
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
    <main className="container grid admin-shell">
      <header className="admin-sticky-nav">
        <div className="admin-sticky-nav-inner">
          <div>
            <div className="badge">Manual Application Pack</div>
            <div className="admin-sticky-title">{lead.fullName}</div>
          </div>
          <div className="admin-topbar">
            <Link href={`/admin/leads/${lead.id}`} className="small admin-sticky-link">Back to lead</Link>
            <Link href="/admin/logout" className="small admin-sticky-link">Log out</Link>
          </div>
        </div>
      </header>

      <ApplicationPackView pack={pack} printHref={`/admin/dashboard/leads/${lead.id}/application-pack/print`} />
    </main>
  );
}
