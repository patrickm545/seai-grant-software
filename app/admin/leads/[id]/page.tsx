import { redirect } from 'next/navigation';

export default async function AdminLeadPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  redirect(`/installer-review-emerald/leads/${encodeURIComponent(id)}`);
}
