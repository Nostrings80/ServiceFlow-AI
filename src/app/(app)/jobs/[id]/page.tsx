import { notFound, redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { StatusBadge } from "@/components/StatusBadge";
import { JobActions } from "./JobActions";

export default async function JobDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return null;

  const { id } = await params;
  const job = await db.job.findFirst({
    where: { id, companyId: session.companyId },
    include: { customer: true, assignedTo: true },
  });
  if (!job) notFound();

  const isAdmin = session.role === "ADMIN";
  if (!isAdmin && job.assignedToId !== session.userId) {
    redirect("/jobs");
  }

  const technicians = isAdmin
    ? await db.user.findMany({ where: { companyId: session.companyId, role: "TECHNICIAN" }, orderBy: { name: "asc" } })
    : [];

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">{job.title}</h1>
          <p className="mt-1 text-sm text-slate-500">{job.customer.name}</p>
        </div>
        <StatusBadge status={job.status} />
      </div>

      <div className="grid grid-cols-1 gap-4 rounded-xl border border-slate-200 bg-white p-6 sm:grid-cols-2">
        <div>
          <p className="text-xs font-medium uppercase text-slate-400">Customer</p>
          <p className="mt-1 text-sm text-slate-800">{job.customer.name}</p>
          {job.customer.phone && <p className="text-sm text-slate-500">{job.customer.phone}</p>}
        </div>
        <div>
          <p className="text-xs font-medium uppercase text-slate-400">Assigned technician</p>
          <p className="mt-1 text-sm text-slate-800">{job.assignedTo ? job.assignedTo.name : "Unassigned"}</p>
        </div>
        <div>
          <p className="text-xs font-medium uppercase text-slate-400">Scheduled</p>
          <p className="mt-1 text-sm text-slate-800">
            {job.scheduledAt ? job.scheduledAt.toLocaleString([], { dateStyle: "medium", timeStyle: "short" }) : "Not scheduled"}
          </p>
        </div>
        <div>
          <p className="text-xs font-medium uppercase text-slate-400">Address</p>
          <p className="mt-1 text-sm text-slate-800">{job.address || "—"}</p>
        </div>
        {job.description && (
          <div className="sm:col-span-2">
            <p className="text-xs font-medium uppercase text-slate-400">Notes</p>
            <p className="mt-1 whitespace-pre-wrap text-sm text-slate-800">{job.description}</p>
          </div>
        )}
      </div>

      <JobActions
        jobId={job.id}
        status={job.status}
        isAdmin={isAdmin}
        assignedToId={job.assignedToId}
        technicians={technicians.map((t) => ({ id: t.id, name: t.name }))}
      />
    </div>
  );
}
