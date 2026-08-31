import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const db = new PrismaClient();

async function main() {
  const passwordHash = await bcrypt.hash("password123", 10);

  const company = await db.company.create({
    data: { name: "Acme Field Services" },
  });

  const admin = await db.user.create({
    data: {
      companyId: company.id,
      name: "Jamie Rivera",
      email: "admin@acme.test",
      passwordHash,
      role: "ADMIN",
    },
  });

  const alex = await db.user.create({
    data: {
      companyId: company.id,
      name: "Alex Chen",
      email: "alex@acme.test",
      passwordHash,
      role: "TECHNICIAN",
      phone: "555-0101",
    },
  });

  const sam = await db.user.create({
    data: {
      companyId: company.id,
      name: "Sam Patel",
      email: "sam@acme.test",
      passwordHash,
      role: "TECHNICIAN",
      phone: "555-0102",
    },
  });

  const [customerA, customerB, customerC] = await Promise.all([
    db.customer.create({
      data: {
        companyId: company.id,
        name: "Riverside Apartments",
        phone: "555-1001",
        address: "220 Riverside Dr",
      },
    }),
    db.customer.create({
      data: {
        companyId: company.id,
        name: "Maple Street Diner",
        phone: "555-1002",
        address: "88 Maple St",
      },
    }),
    db.customer.create({
      data: {
        companyId: company.id,
        name: "Grandview Office Park",
        phone: "555-1003",
        address: "4 Grandview Plaza",
      },
    }),
  ]);

  const now = new Date();
  const today9am = new Date(now);
  today9am.setHours(9, 0, 0, 0);
  const today2pm = new Date(now);
  today2pm.setHours(14, 0, 0, 0);
  const tomorrow10am = new Date(now);
  tomorrow10am.setDate(tomorrow10am.getDate() + 1);
  tomorrow10am.setHours(10, 0, 0, 0);

  await db.job.createMany({
    data: [
      {
        companyId: company.id,
        customerId: customerA.id,
        assignedToId: alex.id,
        title: "Fix leaking kitchen sink",
        description: "Tenant in unit 4B reports steady drip under the sink.",
        address: "220 Riverside Dr, Unit 4B",
        status: "SCHEDULED",
        scheduledAt: today9am,
      },
      {
        companyId: company.id,
        customerId: customerB.id,
        assignedToId: alex.id,
        title: "Inspect walk-in cooler",
        description: "Cooler running warm overnight, check compressor.",
        address: "88 Maple St",
        status: "IN_PROGRESS",
        scheduledAt: today2pm,
      },
      {
        companyId: company.id,
        customerId: customerC.id,
        assignedToId: sam.id,
        title: "Replace HVAC filter bank",
        address: "4 Grandview Plaza, Suite 200",
        status: "SCHEDULED",
        scheduledAt: tomorrow10am,
      },
      {
        companyId: company.id,
        customerId: customerA.id,
        title: "Quarterly fire extinguisher check",
        address: "220 Riverside Dr",
        status: "UNASSIGNED",
      },
      {
        companyId: company.id,
        customerId: customerB.id,
        assignedToId: sam.id,
        title: "Repair dining room lighting",
        address: "88 Maple St",
        status: "COMPLETED",
      },
    ],
  });

  console.log("Seed complete.");
  console.log(`Admin login:      ${admin.email} / password123`);
  console.log(`Technician login: ${alex.email} / password123`);
  console.log(`Technician login: ${sam.email} / password123`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await db.$disconnect();
  });
