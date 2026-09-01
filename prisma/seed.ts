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
      phone: "+15555550101",
    },
  });

  const sam = await db.user.create({
    data: {
      companyId: company.id,
      name: "Sam Patel",
      email: "sam@acme.test",
      passwordHash,
      role: "TECHNICIAN",
      phone: "+15555550102",
    },
  });

  // Real, geocodable addresses so the "on my way" routing demo works once
  // GOOGLE_MAPS_API_KEY is configured. Phone numbers use the 555 exchange,
  // which is reserved for fictional use and never a real subscriber — swap
  // in a real E.164 number to test SMS delivery.
  const [customerA, customerB, customerC] = await Promise.all([
    db.customer.create({
      data: {
        companyId: company.id,
        name: "Riverside Apartments",
        phone: "+15555551001",
        address: "220 Congress Ave, Austin, TX 78701",
      },
    }),
    db.customer.create({
      data: {
        companyId: company.id,
        name: "Maple Street Diner",
        phone: "+15555551002",
        address: "88 Rainey St, Austin, TX 78701",
      },
    }),
    db.customer.create({
      data: {
        companyId: company.id,
        name: "Grandview Office Park",
        phone: "+15555551003",
        address: "4 Barton Springs Rd, Austin, TX 78704",
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
        address: "220 Congress Ave, Unit 4B, Austin, TX 78701",
        status: "SCHEDULED",
        scheduledAt: today9am,
      },
      {
        companyId: company.id,
        customerId: customerB.id,
        assignedToId: alex.id,
        title: "Inspect walk-in cooler",
        description: "Cooler running warm overnight, check compressor.",
        address: "88 Rainey St, Austin, TX 78701",
        status: "IN_PROGRESS",
        scheduledAt: today2pm,
      },
      {
        companyId: company.id,
        customerId: customerC.id,
        assignedToId: sam.id,
        title: "Replace HVAC filter bank",
        address: "4 Barton Springs Rd, Suite 200, Austin, TX 78704",
        status: "SCHEDULED",
        scheduledAt: tomorrow10am,
      },
      {
        companyId: company.id,
        customerId: customerA.id,
        title: "Quarterly fire extinguisher check",
        address: "220 Congress Ave, Austin, TX 78701",
        status: "UNASSIGNED",
      },
      {
        companyId: company.id,
        customerId: customerB.id,
        assignedToId: sam.id,
        title: "Repair dining room lighting",
        address: "88 Rainey St, Austin, TX 78701",
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
