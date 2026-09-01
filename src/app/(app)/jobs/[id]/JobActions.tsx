"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type Technician = { id: string; name: string };

const STATUS_OPTIONS = ["UNASSIGNED", "SCHEDULED", "ON_THE_WAY", "IN_PROGRESS", "COMPLETED", "CANCELED"];

function getCurrentPosition(): Promise<GeolocationPosition> {
  return new Promise((resolve, reject) => {
    if (!("geolocation" in navigator)) {
      reject(new Error("Your browser doesn't support location services."));
      return;
    }
    navigator.geolocation.getCurrentPosition(resolve, reject, {
      enableHighAccuracy: true,
      timeout: 15000,
      maximumAge: 0,
    });
  });
}

function geolocationErrorMessage(err: GeolocationPositionError): string {
  switch (err.code) {
    case err.PERMISSION_DENIED:
      return "Location permission was denied. Allow location access to notify the customer with an ETA.";
    case err.POSITION_UNAVAILABLE:
      return "Your location is currently unavailable. Try again in a moment.";
    case err.TIMEOUT:
      return "Getting your location took too long. Try again.";
    default:
      return "Could not get your location.";
  }
}

export function JobActions({
  jobId,
  status,
  isAdmin,
  assignedToId,
  technicians,
  etaMinutes,
  distanceMeters,
  routeType,
  mapsUrl,
}: {
  jobId: string;
  status: string;
  isAdmin: boolean;
  assignedToId: string | null;
  technicians: Technician[];
  etaMinutes: number | null;
  distanceMeters: number | null;
  routeType: string | null;
  mapsUrl: string | null;
}) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [warnings, setWarnings] = useState<string[]>([]);
  const [pending, setPending] = useState(false);
  const [pendingAction, setPendingAction] = useState<string | null>(null);

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

  async function handleOnMyWay() {
    setError(null);
    setWarnings([]);
    setPending(true);
    setPendingAction("Getting your location…");
    try {
      const position = await getCurrentPosition().catch((err) => {
        throw new Error(err instanceof GeolocationPositionError ? geolocationErrorMessage(err) : err.message);
      });

      setPendingAction("Calculating the best route and notifying the customer…");
      const res = await fetch(`/api/jobs/${jobId}/on-the-way`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Could not notify the customer.");
        return;
      }
      if (data.warnings?.length) setWarnings(data.warnings);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong. Please try again.");
    } finally {
      setPending(false);
      setPendingAction(null);
    }
  }

  if (isAdmin) {
    return (
      <div className="space-y-4 rounded-xl border border-slate-200 bg-white p-6">
        {etaMinutes && (
          <div className="rounded-md bg-purple-50 px-3 py-2 text-sm text-purple-800">
            ETA ~{etaMinutes} min
            {distanceMeters ? ` (${(distanceMeters / 1609.34).toFixed(1)} mi)` : ""}
            {routeType === "FUEL_EFFICIENT" ? " · fuel-efficient route" : " · fastest route with live traffic"}
            {mapsUrl && (
              <>
                {" · "}
                <a href={mapsUrl} target="_blank" rel="noopener noreferrer" className="font-medium underline">
                  Open in Google Maps
                </a>
              </>
            )}
          </div>
        )}
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
                  {s.replaceAll("_", " ")}
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

      {(status === "ON_THE_WAY" || (etaMinutes && status !== "COMPLETED")) && (
        <div className="rounded-md bg-purple-50 px-3 py-2 text-sm text-purple-800">
          {etaMinutes ? (
            <>
              ETA ~{etaMinutes} min
              {distanceMeters ? ` (${(distanceMeters / 1609.34).toFixed(1)} mi)` : ""}
              {routeType === "FUEL_EFFICIENT" ? " · fuel-efficient route" : " · fastest route with live traffic"}
            </>
          ) : (
            "Customer has been notified you're on the way."
          )}
          {mapsUrl && (
            <>
              {" · "}
              <a href={mapsUrl} target="_blank" rel="noopener noreferrer" className="font-medium underline">
                Open in Google Maps
              </a>
            </>
          )}
        </div>
      )}

      <div className="flex flex-wrap gap-3">
        {(status === "SCHEDULED" || status === "UNASSIGNED") && (
          <button
            disabled={pending}
            onClick={handleOnMyWay}
            className="rounded-md bg-purple-600 px-4 py-2 text-sm font-medium text-white hover:bg-purple-700 disabled:opacity-60"
          >
            {pending && pendingAction ? pendingAction : "On my way"}
          </button>
        )}
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

      {warnings.length > 0 && (
        <ul className="space-y-1 text-sm text-amber-600">
          {warnings.map((w) => (
            <li key={w}>⚠ {w}</li>
          ))}
        </ul>
      )}
      {error && <p className="text-sm text-red-600">{error}</p>}
    </div>
  );
}
