/// <reference types="node" />
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  // Seed admin user (optional – use a real email/password in production)
  const adminEmail = process.env.ADMIN_EMAIL ?? 'admin@smart-rental.com';
  const adminPassword = process.env.ADMIN_PASSWORD ?? 'Admin123!';

  const existing = await prisma.user.findUnique({ where: { email: adminEmail } });
  if (!existing) {
    const hashed = await bcrypt.hash(adminPassword, 12);
    await prisma.user.create({
      data: {
        email: adminEmail,
        password: hashed,
        name: 'Admin',
      },
    });
    console.log('Admin user created:', adminEmail);
  }

  // Add Amenities or other seed data when you have the models
  // await prisma.amenity.createMany({ data: [...] });
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
