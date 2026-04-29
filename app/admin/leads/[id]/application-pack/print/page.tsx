import { redirect } from 'next/navigation';

export default async function AdminLeadApplicationPackPrintRedirect({
  params
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  redirect(`/admin/dashboard/leads/${id}/application-pack/print`);
}
