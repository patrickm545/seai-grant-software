import HiddenLeadDetailPage from '@/app/installer-review-emerald/leads/[id]/page';

export default async function AdminLeadPage({ params }: { params: Promise<{ id: string }> }) {
  return <HiddenLeadDetailPage params={params} />;
}
