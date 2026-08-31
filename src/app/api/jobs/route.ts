import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { db } from "@/lib/db";

export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Not authenticated." }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const status = searchParams.get("status");
  const assignedToId = searchParams.get("assignedToId");

  const where: Record<string, unknown> = { companyId: session.companyId };
  if (status) where.status = status;

  if (session.role === "ADMIN") {
    if (assignedToId) where.assignedToId = assignedToId === "unassigned" ? null : assignedToId;
  } else {
    where.assignedToId = session.userId;
  }

  const jobs = await db.job.findMany({
    where,
    include: { customer: true, assignedTo: true },
    orderBy: [{ scheduledAt: "asc" }, { createdAt: "desc" }],
  });

  return NextResponse.json({ jobs });
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  if (session.role !== "ADMIN") {
    return NextResponse.json({ error: "Only admins can create jobs." }, { status: 403 });
  }

  const body = await req.json().catch(() => null);
  const title = typeof body?.title === "string" ? body.title.trim() : "";
  const customerId = typeof body?.customerId === "string" ? body.customerId : "";

  if (!title || !customerId) {
    return NextResponse.json({ error: "Title and customer are required." }, { status: 400 });
  }

  const customer = await db.customer.findFirst({ where: { id: customerId, companyId: session.companyId } });
  if (!customer) {
    return NextResponse.json({ error: "Customer not found." }, { status: 400 });
  }

  let assignedToId: string | null = typeof body?.assignedToId === "string" ? body.assignedToId : null;
  if (assignedToId) {
    const tech = await db.user.findFirst({
      where: { id: assignedToId, companyId: session.companyId, role: "TECHNICIAN" },
    });
    if (!tech) assignedToId = null;
  }

  const job = await db.job.create({
    data: {
      companyId: session.companyId,
      customerId,
      title,
      description: typeof body?.description === "string" ? body.description : null,
      address: typeof body?.address === "string" ? body.address : null,
      scheduledAt: body?.scheduledAt ? new Date(body.scheduledAt) : null,
      assignedToId,
      status: assignedToId ? "SCHEDULED" : "UNASSIGNED",
    },
  });

  return NextResponse.json({ job }, { status: 201 });
}
