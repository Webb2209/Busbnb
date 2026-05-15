import { Trip, Booking } from './types';

export const MOCK_TRIPS: Trip[] = [
  {
    id: 'trip-1',
    route: { id: 'r1', origin: 'Nairobi', destination: 'Mombasa' },
    bus: {
      id: 'b1', plateNumber: 'KDG 123A', capacity: 45, layout: '2x2',
      amenities: ['WiFi', 'AC', 'USB Charging', 'Reclining Seats'],
      company: { id: 'c1', name: 'Dreamline Express', logo: null },
    },
    departureTime: '2026-05-11T07:00:00.000Z',
    arrivalTime: '2026-05-11T13:30:00.000Z',
    price: 1800, availableSeats: 12,
  },
  {
    id: 'trip-2',
    route: { id: 'r2', origin: 'Nairobi', destination: 'Kisumu' },
    bus: {
      id: 'b2', plateNumber: 'KBZ 456B', capacity: 33, layout: '2x1',
      amenities: ['WiFi', 'AC', 'Meals', 'USB Charging'],
      company: { id: 'c2', name: 'Easy Coach', logo: null },
    },
    departureTime: '2026-05-11T08:00:00.000Z',
    arrivalTime: '2026-05-11T14:00:00.000Z',
    price: 1200, availableSeats: 5,
  },
  {
    id: 'trip-3',
    route: { id: 'r3', origin: 'Nairobi', destination: 'Nakuru' },
    bus: {
      id: 'b3', plateNumber: 'KDH 789C', capacity: 45, layout: '2x2',
      amenities: ['AC', 'USB Charging'],
      company: { id: 'c3', name: '2NK Shuttle', logo: null },
    },
    departureTime: '2026-05-11T09:30:00.000Z',
    arrivalTime: '2026-05-11T12:00:00.000Z',
    price: 700, availableSeats: 20,
  },
  {
    id: 'trip-4',
    route: { id: 'r4', origin: 'Mombasa', destination: 'Malindi' },
    bus: {
      id: 'b4', plateNumber: 'KDD 321D', capacity: 45, layout: '2x2',
      amenities: ['AC'],
      company: { id: 'c4', name: 'Coast Bus', logo: null },
    },
    departureTime: '2026-05-11T10:00:00.000Z',
    arrivalTime: '2026-05-11T12:30:00.000Z',
    price: 500, availableSeats: 30,
  },
  {
    id: 'trip-5',
    route: { id: 'r5', origin: 'Nairobi', destination: 'Eldoret' },
    bus: {
      id: 'b5', plateNumber: 'KDC 654E', capacity: 45, layout: '2x2',
      amenities: ['WiFi', 'AC', 'Reclining Seats', 'Blankets'],
      company: { id: 'c5', name: 'Eldoret Express', logo: null },
    },
    departureTime: '2026-05-11T22:00:00.000Z',
    arrivalTime: '2026-05-12T06:00:00.000Z',
    price: 1500, availableSeats: 8,
  },
  {
    id: 'trip-6',
    route: { id: 'r6', origin: 'Kisumu', destination: 'Kampala' },
    bus: {
      id: 'b6', plateNumber: 'KCA 987F', capacity: 33, layout: '2x1',
      amenities: ['WiFi', 'AC', 'Meals', 'Entertainment', 'USB Charging'],
      company: { id: 'c6', name: 'Modern Coast', logo: null },
    },
    departureTime: '2026-05-11T06:30:00.000Z',
    arrivalTime: '2026-05-11T13:30:00.000Z',
    price: 2200, availableSeats: 3,
  },
  {
    id: 'trip-7',
    route: { id: 'r7', origin: 'Nairobi', destination: 'Nyeri' },
    bus: {
      id: 'b7', plateNumber: 'KDB 111G', capacity: 45, layout: '2x2',
      amenities: ['AC'],
      company: { id: 'c7', name: '4N Link', logo: null },
    },
    departureTime: '2026-05-11T11:00:00.000Z',
    arrivalTime: '2026-05-11T13:30:00.000Z',
    price: 600, availableSeats: 25,
  },
  {
    id: 'trip-8',
    route: { id: 'r8', origin: 'Nairobi', destination: 'Machakos' },
    bus: {
      id: 'b8', plateNumber: 'KBG 222H', capacity: 45, layout: '2x2',
      amenities: ['AC', 'USB Charging'],
      company: { id: 'c8', name: 'Machakos Lines', logo: null },
    },
    departureTime: '2026-05-11T06:00:00.000Z',
    arrivalTime: '2026-05-11T07:30:00.000Z',
    price: 350, availableSeats: 40,
  },
];

// Generate seats for a bus layout
export function generateSeats(layout: '2x1' | '2x2', capacity: number) {
  const seats = [];
  const rows = layout === '2x2' ? Math.ceil(capacity / 4) : Math.ceil(capacity / 3);
  const letters = layout === '2x2' ? ['A', 'B', 'C', 'D'] : ['A', 'B', 'C'];

  // Some seats are randomly locked (already booked)
  const lockedCount = Math.floor(capacity * 0.3);
  const lockedSeats = new Set<string>();
  while (lockedSeats.size < lockedCount) {
    const row = Math.floor(Math.random() * rows) + 1;
    const col = letters[Math.floor(Math.random() * letters.length)];
    lockedSeats.add(`${row}${col}`);
  }

  for (let r = 1; r <= rows; r++) {
    for (const col of letters) {
      const num = `${r}${col}`;
      seats.push({
        number: num,
        status: lockedSeats.has(num) ? 'locked' as const : 'available' as const,
      });
    }
  }
  return seats;
}

export function getMockTrip(id: string): Trip | undefined {
  return MOCK_TRIPS.find(t => t.id === id);
}

export function getMockBooking(tripId: string, seats: string[], passenger: { fullName: string; email: string; phone: string }, trip: Trip): Booking {
  return {
    id: `booking-${Date.now()}`,
    bookingRef: `BM-${Date.now().toString(36).toUpperCase()}`,
    trip,
    seats,
    passenger,
    totalAmount: trip.price * seats.length,
    status: 'PENDING',
    createdAt: new Date().toISOString(),
  };
}
