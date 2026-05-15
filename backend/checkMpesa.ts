import { prisma } from './src/config/db';

async function main() {
  const latest = await prisma.mpesaCallback.findFirst({
    orderBy: { receivedAt: 'desc' },
    include: { booking: true },
  });
  
  if (latest) {
    console.log("Latest M-Pesa Callback Raw Payload:");
    console.log(JSON.stringify(latest.rawPayload, null, 2));
    console.log("\nAssociated Booking Status:", latest.booking.status);
  } else {
    console.log("No M-Pesa callbacks found in the database.");
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
