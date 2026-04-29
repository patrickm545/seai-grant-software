import { redirect } from 'next/navigation';

export default async function AdminLeadApplicationPackRedirect({
  params
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  redirect(`/admin/dashboard/leads/${id}/application-pack`);
}
