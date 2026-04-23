import { redirect } from 'next/navigation';

export default async function LegacyAdminDashboardLeadPage({
  params
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  redirect(`/admin/leads/${id}`);
}
