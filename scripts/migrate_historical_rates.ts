import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';
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

/**
 * Historical reference rates (VES / USD) by year/month.
 * Fallback to standard active rate if date is beyond known thresholds.
 */
function getReferenceRateByDate(date: Date, defaultRate: number): number {
  const year = date.getUTCFullYear();
  const month = date.getUTCMonth() + 1;

  if (year >= 2026) {
    if (month >= 8) return 813.74;
    return 750.0;
  }
  if (year === 2025) {
    if (month >= 10) return 70.0;
    if (month >= 6) return 55.0;
    return 45.0;
  }
  if (year === 2024) {
    return 36.5;
  }

  return defaultRate;
}

async function main() {
  console.log('--- Iniciando migración de tasas históricas para transacciones VES ---');

  // Check if an active VES rate exists in exchange_rates table
  const dbVesRate = await prisma.exchangeRate.findUnique({
    where: { currency: 'VES' },
  });
  const fallbackRate = dbVesRate?.rate || 813.74;

  // Find all transactions whose source account is VES and exchangeRate is null or 0
  const legacyTransactions = await prisma.transaction.findMany({
    where: {
      account: {
        currency: 'VES',
      },
      OR: [{ exchangeRate: null }, { exchangeRate: 0 }],
    },
    include: {
      account: true,
    },
  });

  console.log(`Encontradas ${legacyTransactions.length} transacciones en VES sin tasa asignada.`);

  if (legacyTransactions.length === 0) {
    console.log('No hay transacciones pendientes de migración.');
    return;
  }

  let updatedCount = 0;

  for (const tx of legacyTransactions) {
    const txDate = tx.date ? new Date(tx.date) : new Date(tx.createdAt);
    const assignedRate = getReferenceRateByDate(txDate, fallbackRate);

    await prisma.transaction.update({
      where: { id: tx.id },
      data: {
        exchangeRate: assignedRate,
      },
    });

    updatedCount++;
    console.log(
      `[${updatedCount}/${legacyTransactions.length}] Tx ${tx.id} (${txDate.toISOString().slice(0, 10)}) - Monto: ${tx.amount} VES -> Tasa asignada: ${assignedRate}`,
    );
  }

  console.log(`\nMigración completada con éxito. ${updatedCount} transacciones actualizadas.`);
}

main()
  .catch((e) => {
    console.error('Error durante la migración:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
