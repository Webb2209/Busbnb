/**
 * prisma/seed.ts
 * Seeds the database with the same data that was in lib/mockData.ts
 * Run: npm run db:seed
 */
import { PrismaClient, Layout } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

// ─── Helpers ──────────────────────────────────────────────────────────────────

function generateSeats(layout: Layout, capacity: number) {
  const letters = layout === Layout.TWO_BY_TWO ? ['A', 'B', 'C', 'D'] : ['A', 'B', 'C'];
  const rows = layout === Layout.TWO_BY_TWO ? Math.ceil(capacity / 4) : Math.ceil(capacity / 3);

  const seats: { number: string }[] = [];
  for (let r = 1; r <= rows; r++) {
    for (const col of letters) {
      seats.push({ number: `${r}${col}` });
    }
  }
  return seats;
}

// ─── Seed Data ────────────────────────────────────────────────────────────────

async function main() {
  console.log('🌱 Starting seed...');

  // Clean up in dependency order
  await prisma.mpesaCallback.deleteMany();
  await prisma.bookingSeat.deleteMany();
  await prisma.booking.deleteMany();
  await prisma.seat.deleteMany();
  await prisma.trip.deleteMany();
  await prisma.bus.deleteMany();
  await prisma.route.deleteMany();
  await prisma.company.deleteMany();
  await prisma.adminUser.deleteMany();

  // ── Companies ────────────────────────────────────────────────────────────────
  const companies = await Promise.all([
    prisma.company.create({ data: { name: 'Dreamline Express' } }),
    prisma.company.create({ data: { name: 'Easy Coach' } }),
    prisma.company.create({ data: { name: '2NK Shuttle' } }),
    prisma.company.create({ data: { name: 'Coast Bus' } }),
    prisma.company.create({ data: { name: 'Eldoret Express' } }),
    prisma.company.create({ data: { name: 'Modern Coast' } }),
    prisma.company.create({ data: { name: '4N Link' } }),
    prisma.company.create({ data: { name: 'Machakos Lines' } }),
  ]);

  // ── Buses ─────────────────────────────────────────────────────────────────────
  const buses = await Promise.all([
    prisma.bus.create({ data: { plateNumber: 'KDG 123A', capacity: 45, layout: Layout.TWO_BY_TWO, amenities: ['WiFi', 'AC', 'USB Charging', 'Reclining Seats'], companyId: companies[0].id } }),
    prisma.bus.create({ data: { plateNumber: 'KBZ 456B', capacity: 33, layout: Layout.TWO_BY_ONE, amenities: ['WiFi', 'AC', 'Meals', 'USB Charging'], companyId: companies[1].id } }),
    prisma.bus.create({ data: { plateNumber: 'KDH 789C', capacity: 45, layout: Layout.TWO_BY_TWO, amenities: ['AC', 'USB Charging'], companyId: companies[2].id } }),
    prisma.bus.create({ data: { plateNumber: 'KDD 321D', capacity: 45, layout: Layout.TWO_BY_TWO, amenities: ['AC'], companyId: companies[3].id } }),
    prisma.bus.create({ data: { plateNumber: 'KDC 654E', capacity: 45, layout: Layout.TWO_BY_TWO, amenities: ['WiFi', 'AC', 'Reclining Seats', 'Blankets'], companyId: companies[4].id } }),
    prisma.bus.create({ data: { plateNumber: 'KCA 987F', capacity: 33, layout: Layout.TWO_BY_ONE, amenities: ['WiFi', 'AC', 'Meals', 'Entertainment', 'USB Charging'], companyId: companies[5].id } }),
    prisma.bus.create({ data: { plateNumber: 'KDB 111G', capacity: 45, layout: Layout.TWO_BY_TWO, amenities: ['AC'], companyId: companies[6].id } }),
    prisma.bus.create({ data: { plateNumber: 'KBG 222H', capacity: 45, layout: Layout.TWO_BY_TWO, amenities: ['AC', 'USB Charging'], companyId: companies[7].id } }),
  ]);

  // ── Routes ────────────────────────────────────────────────────────────────────
  const routes = await Promise.all([
    prisma.route.create({ data: { origin: 'Nairobi', destination: 'Mombasa' } }),
    prisma.route.create({ data: { origin: 'Nairobi', destination: 'Kisumu' } }),
    prisma.route.create({ data: { origin: 'Nairobi', destination: 'Nakuru' } }),
    prisma.route.create({ data: { origin: 'Mombasa', destination: 'Malindi' } }),
    prisma.route.create({ data: { origin: 'Nairobi', destination: 'Eldoret' } }),
    prisma.route.create({ data: { origin: 'Kisumu', destination: 'Kampala' } }),
    prisma.route.create({ data: { origin: 'Nairobi', destination: 'Nyeri' } }),
    prisma.route.create({ data: { origin: 'Nairobi', destination: 'Machakos' } }),
  ]);

  // ── Trips + Seats ─────────────────────────────────────────────────────────────
  const tripData = [
    { routeIdx: 0, busIdx: 0, price: 1800, departure: '2026-05-15T07:00:00.000Z', arrival: '2026-05-15T13:30:00.000Z' },
    { routeIdx: 1, busIdx: 1, price: 1200, departure: '2026-05-15T08:00:00.000Z', arrival: '2026-05-15T14:00:00.000Z' },
    { routeIdx: 2, busIdx: 2, price: 700,  departure: '2026-05-15T09:30:00.000Z', arrival: '2026-05-15T12:00:00.000Z' },
    { routeIdx: 3, busIdx: 3, price: 500,  departure: '2026-05-15T10:00:00.000Z', arrival: '2026-05-15T12:30:00.000Z' },
    { routeIdx: 4, busIdx: 4, price: 1500, departure: '2026-05-15T22:00:00.000Z', arrival: '2026-05-16T06:00:00.000Z' },
    { routeIdx: 5, busIdx: 5, price: 2200, departure: '2026-05-15T06:30:00.000Z', arrival: '2026-05-15T13:30:00.000Z' },
    { routeIdx: 6, busIdx: 6, price: 600,  departure: '2026-05-15T11:00:00.000Z', arrival: '2026-05-15T13:30:00.000Z' },
    { routeIdx: 7, busIdx: 7, price: 350,  departure: '2026-05-15T06:00:00.000Z', arrival: '2026-05-15T07:30:00.000Z' },
  ];

  for (const t of tripData) {
    const bus = buses[t.busIdx];
    const seatNumbers = generateSeats(bus.layout, bus.capacity);

    await prisma.trip.create({
      data: {
        routeId: routes[t.routeIdx].id,
        busId: bus.id,
        departureTime: new Date(t.departure),
        arrivalTime: new Date(t.arrival),
        price: t.price,
        seats: {
          create: seatNumbers,
        },
      },
    });
  }

  // ── Admin User ────────────────────────────────────────────────────────────────
  const passwordHash = await bcrypt.hash('admin1234', 12);
  await prisma.adminUser.create({
    data: {
      email: 'admin@busbnb.co.ke',
      passwordHash,
    },
  });

  console.log('✅ Seed complete!');
  console.log('   Admin credentials: admin@busbnb.co.ke / admin1234');
  console.log('   ⚠️  Change the admin password before deploying to production!');
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
