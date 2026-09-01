import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { db } from "@/lib/db";

const VALID_STATUSES = ["UNASSIGNED", "SCHEDULED", "ON_THE_WAY", "IN_PROGRESS", "COMPLETED", "CANCELED"];
const TECHNICIAN_ALLOWED_STATUSES = ["IN_PROGRESS", "COMPLETED"];

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Not authenticated." }, { status: 401 });

  const { id } = await params;
  const job = await db.job.findFirst({
    where: { id, companyId: session.companyId },
    include: { customer: true, assignedTo: true },
  });
  if (!job) return NextResponse.json({ error: "Job not found." }, { status: 404 });

  if (session.role !== "ADMIN" && job.assignedToId !== session.userId) {
    return NextResponse.json({ error: "Not authorized to view this job." }, { status: 403 });
  }

  return NextResponse.json({ job });
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Not authenticated." }, { status: 401 });

  const { id } = await params;
  const existing = await db.job.findFirst({ where: { id, companyId: session.companyId } });
  if (!existing) return NextResponse.json({ error: "Job not found." }, { status: 404 });

  const body = await req.json().catch(() => null);
  if (!body) return NextResponse.json({ error: "Invalid request body." }, { status: 400 });

  const data: Record<string, unknown> = {};

  if (session.role === "ADMIN") {
    if (typeof body.title === "string" && body.title.trim()) data.title = body.title.trim();
    if (typeof body.description === "string" || body.description === null) data.description = body.description;
    if (typeof body.address === "string" || body.address === null) data.address = body.address;
    if (body.scheduledAt === null || typeof body.scheduledAt === "string") {
      data.scheduledAt = body.scheduledAt ? new Date(body.scheduledAt) : null;
    }
    if (typeof body.assignedToId === "string" || body.assignedToId === null) {
      if (body.assignedToId) {
        const tech = await db.user.findFirst({
          where: { id: body.assignedToId, companyId: session.companyId, role: "TECHNICIAN" },
        });
        if (!tech) return NextResponse.json({ error: "Technician not found." }, { status: 400 });
      }
      data.assignedToId = body.assignedToId;
    }
    if (typeof body.status === "string") {
      if (!VALID_STATUSES.includes(body.status)) {
        return NextResponse.json({ error: "Invalid status." }, { status: 400 });
      }
      data.status = body.status;
    }
  } else {
    if (existing.assignedToId !== session.userId) {
      return NextResponse.json({ error: "Not authorized to update this job." }, { status: 403 });
    }
    if (typeof body.status === "string") {
      if (!TECHNICIAN_ALLOWED_STATUSES.includes(body.status)) {
        return NextResponse.json({ error: "Technicians can only mark a job in progress or completed." }, { status: 403 });
      }
      data.status = body.status;
    } else {
      return NextResponse.json({ error: "No permitted fields to update." }, { status: 400 });
    }
  }

  const job = await db.job.update({
    where: { id: existing.id },
    data,
    include: { customer: true, assignedTo: true },
  });

  return NextResponse.json({ job });
}
