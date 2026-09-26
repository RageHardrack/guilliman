import { PrismaClient, LeonRole } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';
import * as bcrypt from 'bcrypt';
import * as dotenv from 'dotenv';

dotenv.config();

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  console.error('Error: DATABASE_URL is not defined in environment variables.');
  process.exit(1);
}

const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  const args = process.argv.slice(2);
  const email = args[0] || 'admin@leon.dev';
  const password = args[1] || 'admin123456';
  const name = args[2] || 'Superadmin Leon';

  const existing = await prisma.leonUser.findUnique({
    where: { email: email.toLowerCase() },
  });

  const hashedPassword = await bcrypt.hash(password, 10);

  if (existing) {
    const updated = await prisma.leonUser.update({
      where: { email: email.toLowerCase() },
      data: {
        password: hashedPassword,
        name,
        role: LeonRole.ADMIN,
        isActive: true,
      },
    });
    console.log(`✅ Leon Admin user updated: ${updated.email} (Role: ${updated.role})`);
  } else {
    const created = await prisma.leonUser.create({
      data: {
        email: email.toLowerCase(),
        password: hashedPassword,
        name,
        role: LeonRole.ADMIN,
        isActive: true,
      },
    });
    console.log(`✅ Leon Admin user created: ${created.email} (Role: ${created.role})`);
  }

  await prisma.$disconnect();
  await pool.end();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
