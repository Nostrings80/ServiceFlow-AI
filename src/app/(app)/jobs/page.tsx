import Link from "next/link";
import { getSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { StatusBadge } from "@/components/StatusBadge";

const STATUSES = ["UNASSIGNED", "SCHEDULED", "ON_THE_WAY", "IN_PROGRESS", "COMPLETED", "CANCELED"];

export default async function JobsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; assignedToId?: string }>;
}) {
  const session = await getSession();
  if (!session) return null;
  const isAdmin = session.role === "ADMIN";
  const sp = await searchParams;

  const where: Record<string, unknown> = { companyId: session.companyId };
  if (sp.status && STATUSES.includes(sp.status)) {
    where.status = sp.status;
  }
  if (isAdmin) {
    if (sp.assignedToId) {
      where.assignedToId = sp.assignedToId === "unassigned" ? null : sp.assignedToId;
    }
  } else {
    where.assignedToId = session.userId;
  }

  const [jobs, technicians] = await Promise.all([
    db.job.findMany({
      where,
      include: { customer: true, assignedTo: true },
      orderBy: [{ scheduledAt: "asc" }, { createdAt: "desc" }],
    }),
    isAdmin
      ? db.user.findMany({ where: { companyId: session.companyId, role: "TECHNICIAN" }, orderBy: { name: "asc" } })
      : Promise.resolve([]),
  ]);

  function buildHref(next: { status?: string; assignedToId?: string }) {
    const params = new URLSearchParams();
    const status = next.status !== undefined ? next.status : sp.status;
    const assignedToId = next.assignedToId !== undefined ? next.assignedToId : sp.assignedToId;
    if (status) params.set("status", status);
    if (assignedToId) params.set("assignedToId", assignedToId);
    const qs = params.toString();
    return qs ? `/jobs?${qs}` : "/jobs";
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Jobs</h1>
          <p className="mt-1 text-sm text-slate-500">
            {isAdmin ? "All work orders across your team." : "Work orders assigned to you."}
          </p>
        </div>
        {isAdmin && (
          <Link
            href="/jobs/new"
            className="rounded-md bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700"
          >
            New job
          </Link>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Link
          href={buildHref({ status: "" })}
          className={`rounded-full px-3 py-1 text-xs font-medium ${
            !sp.status ? "bg-slate-900 text-white" : "bg-slate-100 text-slate-600"
          }`}
        >
          All
        </Link>
        {STATUSES.map((status) => (
          <Link
            key={status}
            href={buildHref({ status })}
            className={`rounded-full px-3 py-1 text-xs font-medium ${
              sp.status === status ? "bg-slate-900 text-white" : "bg-slate-100 text-slate-600"
            }`}
          >
            {status.replaceAll("_", " ")}
          </Link>
        ))}
      </div>

      {isAdmin && technicians.length > 0 && (
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <span className="text-slate-500">Technician:</span>
          <Link
            href={buildHref({ assignedToId: "" })}
            className={`rounded-full px-3 py-1 font-medium ${
              !sp.assignedToId ? "bg-slate-900 text-white" : "bg-slate-100 text-slate-600"
            }`}
          >
            All
          </Link>
          <Link
            href={buildHref({ assignedToId: "unassigned" })}
            className={`rounded-full px-3 py-1 font-medium ${
              sp.assignedToId === "unassigned" ? "bg-slate-900 text-white" : "bg-slate-100 text-slate-600"
            }`}
          >
            Unassigned
          </Link>
          {technicians.map((tech) => (
            <Link
              key={tech.id}
              href={buildHref({ assignedToId: tech.id })}
              className={`rounded-full px-3 py-1 font-medium ${
                sp.assignedToId === tech.id ? "bg-slate-900 text-white" : "bg-slate-100 text-slate-600"
              }`}
            >
              {tech.name}
            </Link>
          ))}
        </div>
      )}

      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
        {jobs.length === 0 ? (
          <p className="px-4 py-6 text-sm text-slate-500">No jobs match these filters.</p>
        ) : (
          <ul className="divide-y divide-slate-100">
            {jobs.map((job) => (
              <li key={job.id} className="flex items-center justify-between px-4 py-3">
                <div>
                  <Link href={`/jobs/${job.id}`} className="font-medium text-slate-900 hover:underline">
                    {job.title}
                  </Link>
                  <p className="text-sm text-slate-500">
                    {job.customer.name}
                    {isAdmin ? ` · ${job.assignedTo ? job.assignedTo.name : "Unassigned"}` : ""}
                    {job.scheduledAt ? ` · ${job.scheduledAt.toLocaleString([], { dateStyle: "medium", timeStyle: "short" })}` : ""}
                  </p>
                </div>
                <StatusBadge status={job.status} />
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
