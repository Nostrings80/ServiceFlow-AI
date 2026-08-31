import { getSession } from "@/lib/auth";
import { NavLink } from "@/components/NavLink";
import { LogoutButton } from "@/components/LogoutButton";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession();

  return (
    <div className="min-h-screen">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
          <div className="flex items-center gap-6">
            <span className="text-base font-semibold text-brand-700">ServiceFlow AI</span>
            <nav className="flex items-center gap-1">
              <NavLink href="/dashboard">Dashboard</NavLink>
              <NavLink href="/jobs">Jobs</NavLink>
              {session?.role === "ADMIN" && <NavLink href="/technicians">Technicians</NavLink>}
              {session?.role === "ADMIN" && <NavLink href="/customers">Customers</NavLink>}
            </nav>
          </div>
          <div className="flex items-center gap-3">
            <div className="text-right text-sm">
              <p className="font-medium text-slate-800">{session?.name}</p>
              <p className="text-xs text-slate-500">{session?.role === "ADMIN" ? "Admin" : "Technician"}</p>
            </div>
            <LogoutButton />
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-4 py-8">{children}</main>
    </div>
  );
}
