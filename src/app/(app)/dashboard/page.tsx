import Link from "next/link";
import { getSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { StatusBadge } from "@/components/StatusBadge";

const STATUSES = ["UNASSIGNED", "SCHEDULED", "ON_THE_WAY", "IN_PROGRESS", "COMPLETED", "CANCELED"] as const;

export default async function DashboardPage() {
  const session = await getSession();
  if (!session) return null;

  const isAdmin = session.role === "ADMIN";
  const scopeWhere = isAdmin
    ? { companyId: session.companyId }
    : { companyId: session.companyId, assignedToId: session.userId };

  const [counts, todaysJobs] = await Promise.all([
    Promise.all(
      STATUSES.map((status) =>
        db.job.count({ where: { ...scopeWhere, status } }).then((count) => ({ status, count }))
      )
    ),
    db.job.findMany({
      where: {
        ...scopeWhere,
        scheduledAt: {
          gte: new Date(new Date().setHours(0, 0, 0, 0)),
          lt: new Date(new Date().setHours(23, 59, 59, 999)),
        },
      },
      include: { customer: true, assignedTo: true },
      orderBy: { scheduledAt: "asc" },
    }),
  ]);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">
          {isAdmin ? "Company overview" : "My jobs overview"}
        </h1>
        <p className="mt-1 text-sm text-slate-500">
          {isAdmin
            ? "Track every job across your team of technicians."
            : "Here's what's on your schedule."}
        </p>
      </div>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
        {counts.map(({ status, count }) => (
          <div key={status} className="rounded-xl border border-slate-200 bg-white p-4">
            <p className="text-2xl font-semibold text-slate-900">{count}</p>
            <div className="mt-2">
              <StatusBadge status={status} />
            </div>
          </div>
        ))}
      </div>

      <div className="rounded-xl border border-slate-200 bg-white">
        <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
          <h2 className="text-sm font-semibold text-slate-800">Today's jobs</h2>
          <Link href="/jobs" className="text-sm text-brand-600 hover:underline">
            View all jobs
          </Link>
        </div>
        {todaysJobs.length === 0 ? (
          <p className="px-4 py-6 text-sm text-slate-500">No jobs scheduled for today.</p>
        ) : (
          <ul className="divide-y divide-slate-100">
            {todaysJobs.map((job) => (
              <li key={job.id} className="flex items-center justify-between px-4 py-3">
                <div>
                  <Link href={`/jobs/${job.id}`} className="font-medium text-slate-900 hover:underline">
                    {job.title}
                  </Link>
                  <p className="text-sm text-slate-500">
                    {job.customer.name}
                    {isAdmin && job.assignedTo ? ` · ${job.assignedTo.name}` : ""}
                    {job.scheduledAt
                      ? ` · ${job.scheduledAt.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`
                      : ""}
                    {job.status === "ON_THE_WAY" && job.etaMinutes ? ` · ETA ~${job.etaMinutes} min` : ""}
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
