import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { geocodeAddress, computeBestRoute } from "@/lib/maps";
import { sendSms } from "@/lib/sms";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Not authenticated." }, { status: 401 });

  const { id } = await params;
  const job = await db.job.findFirst({
    where: { id, companyId: session.companyId },
    include: { customer: true, assignedTo: true, company: true },
  });
  if (!job) return NextResponse.json({ error: "Job not found." }, { status: 404 });

  if (session.role !== "ADMIN" && job.assignedToId !== session.userId) {
    return NextResponse.json({ error: "Not authorized to update this job." }, { status: 403 });
  }
  if (!job.assignedToId) {
    return NextResponse.json({ error: "This job has no assigned technician yet." }, { status: 400 });
  }

  const body = await req.json().catch(() => null);
  const originLat = typeof body?.lat === "number" ? body.lat : null;
  const originLng = typeof body?.lng === "number" ? body.lng : null;
  if (originLat === null || originLng === null) {
    return NextResponse.json({ error: "Your current location is required." }, { status: 400 });
  }

  const warnings: string[] = [];

  // Resolve a destination to route to, geocoding + caching it on the job if needed.
  let destination = job.lat !== null && job.lng !== null ? { lat: job.lat, lng: job.lng } : null;
  const addressToGeocode = job.address || job.customer.address;
  if (!destination && addressToGeocode) {
    destination = await geocodeAddress(addressToGeocode);
    if (!destination) warnings.push("Could not determine the job's location, so no route was calculated.");
  } else if (!destination) {
    warnings.push("This job has no address on file, so no route was calculated.");
  }

  let route: Awaited<ReturnType<typeof computeBestRoute>> = null;
  if (destination) {
    route = await computeBestRoute({ lat: originLat, lng: originLng }, destination);
    if (!route) warnings.push("Route could not be calculated (mapping service unavailable).");
  }

  const updated = await db.job.update({
    where: { id: job.id },
    data: {
      status: "ON_THE_WAY",
      lat: destination?.lat ?? job.lat,
      lng: destination?.lng ?? job.lng,
      etaMinutes: route?.etaMinutes ?? job.etaMinutes,
      distanceMeters: route?.distanceMeters ?? job.distanceMeters,
      routeType: route?.routeType ?? job.routeType,
      onWayNotifiedAt: new Date(),
    },
    include: { customer: true, assignedTo: true },
  });

  const technicianName = job.assignedTo?.name ?? "Your technician";
  const etaPhrase = route ? ` and should arrive in about ${route.etaMinutes} minute${route.etaMinutes === 1 ? "" : "s"}` : "";
  const message = `Hi ${job.customer.name}, this is ${job.company.name}. ${technicianName} is on the way for "${job.title}"${etaPhrase}.`;

  const smsResult = await sendSms(job.customer.phone ?? "", message);
  if (!smsResult.sent) warnings.push(`SMS not sent: ${smsResult.reason}`);

  return NextResponse.json({
    job: updated,
    route,
    sms: smsResult,
    warnings,
  });
}
