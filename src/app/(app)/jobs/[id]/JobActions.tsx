"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type Technician = { id: string; name: string };

const STATUS_OPTIONS = ["UNASSIGNED", "SCHEDULED", "IN_PROGRESS", "COMPLETED", "CANCELED"];

export function JobActions({
  jobId,
  status,
  isAdmin,
  assignedToId,
  technicians,
}: {
  jobId: string;
  status: string;
  isAdmin: boolean;
  assignedToId: string | null;
  technicians: Technician[];
}) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function patch(body: Record<string, unknown>) {
    setError(null);
    setPending(true);
    try {
      const res = await fetch(`/api/jobs/${jobId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Update failed.");
        return;
      }
      router.refresh();
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setPending(false);
    }
  }

  if (isAdmin) {
    return (
      <div className="space-y-4 rounded-xl border border-slate-200 bg-white p-6">
        <h2 className="text-sm font-semibold text-slate-800">Manage job</h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label className="block text-sm font-medium text-slate-700">Status</label>
            <select
              disabled={pending}
              value={status}
              onChange={(e) => patch({ status: e.target.value })}
              className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
            >
              {STATUS_OPTIONS.map((s) => (
                <option key={s} value={s}>
                  {s.replace("_", " ")}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700">Assigned technician</label>
            <select
              disabled={pending}
              value={assignedToId ?? ""}
              onChange={(e) => patch({ assignedToId: e.target.value || null })}
              className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
            >
              <option value="">Unassigned</option>
              {technicians.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </select>
          </div>
        </div>
        {error && <p className="text-sm text-red-600">{error}</p>}
      </div>
    );
  }

  return (
    <div className="space-y-3 rounded-xl border border-slate-200 bg-white p-6">
      <h2 className="text-sm font-semibold text-slate-800">Update job status</h2>
      <div className="flex gap-3">
        {status !== "IN_PROGRESS" && status !== "COMPLETED" && (
          <button
            disabled={pending}
            onClick={() => patch({ status: "IN_PROGRESS" })}
            className="rounded-md bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-60"
          >
            Start job
          </button>
        )}
        {status !== "COMPLETED" && (
          <button
            disabled={pending}
            onClick={() => patch({ status: "COMPLETED" })}
            className="rounded-md bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700 disabled:opacity-60"
          >
            Mark completed
          </button>
        )}
        {status === "COMPLETED" && <p className="text-sm text-slate-500">This job is complete.</p>}
      </div>
      {error && <p className="text-sm text-red-600">{error}</p>}
    </div>
  );
}
