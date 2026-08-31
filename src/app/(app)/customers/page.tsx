import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { AddCustomerForm } from "./AddCustomerForm";

export default async function CustomersPage() {
  const session = await getSession();
  if (!session) return null;
  if (session.role !== "ADMIN") redirect("/dashboard");

  const customers = await db.customer.findMany({
    where: { companyId: session.companyId },
    orderBy: { name: "asc" },
    include: { _count: { select: { jobs: true } } },
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">Customers</h1>
        <p className="mt-1 text-sm text-slate-500">The accounts you dispatch technicians to.</p>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
            {customers.length === 0 ? (
              <p className="px-4 py-6 text-sm text-slate-500">No customers yet. Add your first one.</p>
            ) : (
              <ul className="divide-y divide-slate-100">
                {customers.map((customer) => (
                  <li key={customer.id} className="flex items-center justify-between px-4 py-3">
                    <div>
                      <p className="font-medium text-slate-900">{customer.name}</p>
                      <p className="text-sm text-slate-500">
                        {[customer.phone, customer.email, customer.address].filter(Boolean).join(" · ")}
                      </p>
                    </div>
                    <span className="text-sm text-slate-500">{customer._count.jobs} jobs</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
        <AddCustomerForm />
      </div>
    </div>
  );
}
