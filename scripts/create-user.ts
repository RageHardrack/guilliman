import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';
import * as bcrypt from 'bcrypt';
import * as dotenv from 'dotenv';

dotenv.config();

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  console.error('Error: DATABASE_URL no está definida en las variables de entorno.');
  process.exit(1);
}

const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  const args = process.argv.slice(2);
  const email = args[0];
  const password = args[1];
  const name = args[2] || 'Usuario';
  const rawRole = (args[3] || 'USER').toUpperCase();
  const role = rawRole === 'ADMIN' ? 'ADMIN' : 'USER';

  if (!email || !password) {
    console.log('Uso: bun run create:user <email> <password> [nombre] [role: ADMIN|USER]');
    console.log('Ejemplo: bun run create:user daniel@lascar.dev miClaveSegura123 "Daniel Colmenares" ADMIN');
    process.exit(1);
  }

  const existingUser = await prisma.user.findUnique({
    where: { email },
  });

  const hashedPassword = await bcrypt.hash(password, 10);

  if (existingUser) {
    const updated = await prisma.user.update({
      where: { email },
      data: {
        password: hashedPassword,
        name,
        role,
      },
    });
    console.log(`Usuario existente actualizado: ${updated.email} (${updated.id}) - Rol: ${updated.role}`);
  } else {
    const created = await prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        name,
        role,
      },
    });
    console.log(`Usuario creado exitosamente: ${created.email} (ID: ${created.id}) - Rol: ${created.role}`);
  }
}

main()
  .catch((e) => {
    console.error('Error al ejecutar el script:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
