import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { getSession } from "@/lib/auth";
import { db } from "@/lib/db";

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  if (session.role !== "ADMIN") return NextResponse.json({ error: "Admins only." }, { status: 403 });

  const technicians = await db.user.findMany({
    where: { companyId: session.companyId, role: "TECHNICIAN" },
    orderBy: { name: "asc" },
    select: { id: true, name: true, email: true, phone: true, createdAt: true, _count: { select: { assignedJobs: true } } },
  });

  return NextResponse.json({ technicians });
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  if (session.role !== "ADMIN") return NextResponse.json({ error: "Admins only." }, { status: 403 });

  const body = await req.json().catch(() => null);
  const name = typeof body?.name === "string" ? body.name.trim() : "";
  const email = typeof body?.email === "string" ? body.email.trim().toLowerCase() : "";
  const password = typeof body?.password === "string" ? body.password : "";
  const phone = typeof body?.phone === "string" ? body.phone.trim() : "";

  if (!name || !email || password.length < 8) {
    return NextResponse.json(
      { error: "Name, email, and a password of at least 8 characters are required." },
      { status: 400 }
    );
  }

  const existing = await db.user.findUnique({ where: { email } });
  if (existing) {
    return NextResponse.json({ error: "A user with that email already exists." }, { status: 409 });
  }

  const passwordHash = await bcrypt.hash(password, 10);
  const technician = await db.user.create({
    data: {
      companyId: session.companyId,
      name,
      email,
      passwordHash,
      phone: phone || null,
      role: "TECHNICIAN",
    },
    select: { id: true, name: true, email: true, phone: true, createdAt: true },
  });

  return NextResponse.json({ technician }, { status: 201 });
}
