import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { db } from "@/lib/db";

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  if (session.role !== "ADMIN") return NextResponse.json({ error: "Admins only." }, { status: 403 });

  const customers = await db.customer.findMany({
    where: { companyId: session.companyId },
    orderBy: { name: "asc" },
    select: { id: true, name: true, email: true, phone: true, address: true, _count: { select: { jobs: true } } },
  });

  return NextResponse.json({ customers });
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  if (session.role !== "ADMIN") return NextResponse.json({ error: "Admins only." }, { status: 403 });

  const body = await req.json().catch(() => null);
  const name = typeof body?.name === "string" ? body.name.trim() : "";
  if (!name) {
    return NextResponse.json({ error: "Customer name is required." }, { status: 400 });
  }

  const customer = await db.customer.create({
    data: {
      companyId: session.companyId,
      name,
      email: typeof body?.email === "string" && body.email.trim() ? body.email.trim() : null,
      phone: typeof body?.phone === "string" && body.phone.trim() ? body.phone.trim() : null,
      address: typeof body?.address === "string" && body.address.trim() ? body.address.trim() : null,
    },
  });

  return NextResponse.json({ customer }, { status: 201 });
}
