import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { AddTechnicianForm } from "./AddTechnicianForm";

export default async function TechniciansPage() {
  const session = await getSession();
  if (!session) return null;
  if (session.role !== "ADMIN") redirect("/dashboard");

  const technicians = await db.user.findMany({
    where: { companyId: session.companyId, role: "TECHNICIAN" },
    orderBy: { name: "asc" },
    include: { _count: { select: { assignedJobs: true } } },
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">Technicians</h1>
        <p className="mt-1 text-sm text-slate-500">Manage the team members you dispatch jobs to.</p>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
            {technicians.length === 0 ? (
              <p className="px-4 py-6 text-sm text-slate-500">No technicians yet. Add your first one.</p>
            ) : (
              <ul className="divide-y divide-slate-100">
                {technicians.map((tech) => (
                  <li key={tech.id} className="flex items-center justify-between px-4 py-3">
                    <div>
                      <p className="font-medium text-slate-900">{tech.name}</p>
                      <p className="text-sm text-slate-500">
                        {tech.email}
                        {tech.phone ? ` · ${tech.phone}` : ""}
                      </p>
                    </div>
                    <span className="text-sm text-slate-500">{tech._count.assignedJobs} jobs</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
        <AddTechnicianForm />
      </div>
    </div>
  );
}
