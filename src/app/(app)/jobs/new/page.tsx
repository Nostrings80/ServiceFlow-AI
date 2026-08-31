import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { NewJobForm } from "./NewJobForm";

export default async function NewJobPage() {
  const session = await getSession();
  if (!session) return null;
  if (session.role !== "ADMIN") redirect("/jobs");

  const [customers, technicians] = await Promise.all([
    db.customer.findMany({ where: { companyId: session.companyId }, orderBy: { name: "asc" } }),
    db.user.findMany({ where: { companyId: session.companyId, role: "TECHNICIAN" }, orderBy: { name: "asc" } }),
  ]);

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">New job</h1>
        <p className="mt-1 text-sm text-slate-500">Create a work order and optionally assign a technician.</p>
      </div>
      {customers.length === 0 ? (
        <p className="rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          You need at least one customer before creating a job. Add one from the{" "}
          <a href="/customers" className="underline">
            Customers
          </a>{" "}
          page first.
        </p>
      ) : (
        <NewJobForm
          customers={customers.map((c) => ({ id: c.id, name: c.name }))}
          technicians={technicians.map((t) => ({ id: t.id, name: t.name }))}
        />
      )}
    </div>
  );
}
