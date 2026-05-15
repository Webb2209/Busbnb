/**
 * lib/api.ts
 * Typed HTTP client for the BusBnB backend API.
 * Replaces all mock data calls throughout the frontend.
 */

const BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';

// ─── Shared fetch helper ──────────────────────────────────────────────────────

async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    headers: { 'Content-Type': 'application/json', ...init?.headers },
    ...init,
  });

  const json = await res.json();

  if (!res.ok) {
    throw new Error(json?.error ?? `API error ${res.status}`);
  }

  return json as T;
}

// ─── Response shapes (matching backend output) ────────────────────────────────

export interface ApiRoute {
  id: string;
  origin: string;
  destination: string;
  createdAt?: string;
  _count?: { trips: number };
}

export interface ApiCompany {
  id: string;
  name: string;
  logoUrl: string | null;
}

export interface ApiBus {
  id: string;
  plateNumber: string;
  capacity: number;
  layout: 'TWO_BY_ONE' | 'TWO_BY_TWO';
  amenities: string[];
  company: ApiCompany;
}

export interface ApiSeat {
  id: string;
  number: string;
  status: 'available' | 'locked';
}

export interface ApiTrip {
  id: string;
  route: ApiRoute;
  bus: ApiBus;
  departureTime: string;
  arrivalTime: string;
  price: number;
  availableSeats: number;
  status: 'SCHEDULED' | 'DEPARTED' | 'CANCELLED';
}

export interface ApiTripDetail extends Omit<ApiTrip, 'availableSeats'> {
  seats: ApiSeat[];
}

export interface ApiBooking {
  id: string;
  bookingRef: string;
  status: 'PENDING' | 'PAID' | 'FAILED';
  mpesaRef?: string;
  totalAmount: number;
  createdAt: string;
  passenger: {
    fullName: string;
    email: string;
    phone: string;
  };
  seats: string[];
  trip: {
    id: string;
    route: ApiRoute;
    bus: ApiBus;
    departureTime: string;
    arrivalTime: string;
    price: number;
  };
}

export interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

// ─── Helper: map API layout enum → frontend layout string ─────────────────────

export function mapLayout(layout: 'TWO_BY_ONE' | 'TWO_BY_TWO'): '2x1' | '2x2' {
  return layout === 'TWO_BY_ONE' ? '2x1' : '2x2';
}

// ─── Routes ───────────────────────────────────────────────────────────────────

export async function getRoutes(): Promise<ApiRoute[]> {
  const res = await apiFetch<{ success: boolean; data: ApiRoute[] }>('/api/routes');
  return res.data;
}

// ─── Trips ────────────────────────────────────────────────────────────────────

export interface TripSearchParams {
  origin?: string;
  destination?: string;
  date?: string;
  page?: number;
  limit?: number;
}

export async function getTrips(
  params: TripSearchParams = {},
): Promise<{ trips: ApiTrip[]; pagination: Pagination }> {
  const qs = new URLSearchParams();
  if (params.origin) qs.set('origin', params.origin);
  if (params.destination) qs.set('destination', params.destination);
  if (params.date) qs.set('date', params.date);
  if (params.page) qs.set('page', String(params.page));
  if (params.limit) qs.set('limit', String(params.limit));

  const res = await apiFetch<{ success: boolean; data: ApiTrip[]; pagination: Pagination }>(
    `/api/trips?${qs.toString()}`,
  );
  return { trips: res.data, pagination: res.pagination };
}

export async function getTrip(id: string): Promise<ApiTripDetail> {
  const res = await apiFetch<{ success: boolean; data: ApiTripDetail }>(`/api/trips/${id}`);
  return res.data;
}

// ─── Seat Locking ─────────────────────────────────────────────────────────────

export async function lockSeats(
  tripId: string,
  seats: string[],
): Promise<{ lockToken: string; expiresIn: number }> {
  const res = await apiFetch<{ success: boolean; data: { lockToken: string; expiresIn: number } }>(
    `/api/trips/${tripId}/lock-seats`,
    { method: 'POST', body: JSON.stringify({ seats }) },
  );
  return res.data;
}

export async function unlockSeats(tripId: string, seats: string[], lockToken: string): Promise<void> {
  await apiFetch(`/api/trips/${tripId}/lock-seats`, {
    method: 'DELETE',
    body: JSON.stringify({ seats, lockToken }), // VULN-06 Fix
  });
}

// ─── Bookings ─────────────────────────────────────────────────────────────────

export interface CreateBookingParams {
  tripId: string;
  lockToken: string;
  passenger: {
    fullName: string;
    email: string;
    phone: string;
  };
}

export interface CreateBookingResult {
  bookingId: string;
  bookingRef: string;
  status: 'PENDING' | 'PAID' | 'FAILED';
  totalAmount: number;
}

export async function createBooking(params: CreateBookingParams): Promise<CreateBookingResult> {
  const res = await apiFetch<{ success: boolean; data: CreateBookingResult }>('/api/bookings', {
    method: 'POST',
    body: JSON.stringify(params),
  });
  return res.data;
}

export async function getBooking(bookingRef: string, email: string): Promise<ApiBooking> {
  const qs = new URLSearchParams({ email }); // VULN-07 Fix
  const res = await apiFetch<{ success: boolean; data: ApiBooking }>(
    `/api/bookings/${bookingRef}?${qs.toString()}`,
  );
  return res.data;
}

/**
 * Polls GET /api/bookings/:bookingRef every `intervalMs` until
 * status is PAID or FAILED, or `timeoutMs` is reached.
 */
export async function pollBookingStatus(
  bookingRef: string,
  email: string, // VULN-07 Fix
  onUpdate: (booking: ApiBooking) => void,
  intervalMs = 3000,
  timeoutMs = 5 * 60 * 1000, // 5 minutes
): Promise<void> {
  const deadline = Date.now() + timeoutMs;

  const poll = async () => {
    if (Date.now() > deadline) return;

    try {
      const booking = await getBooking(bookingRef, email);
      onUpdate(booking);

      if (booking.status === 'PENDING') {
        setTimeout(poll, intervalMs);
      }
    } catch {
      // Network error — retry after interval
      setTimeout(poll, intervalMs);
    }
  };

  poll();
}

// ─── Operators ────────────────────────────────────────────────────────────────

export interface OperatorSignupParams {
  companyName: string;
  contactName: string;
  email: string;
  password: string;
}

export async function operatorSignup(params: OperatorSignupParams): Promise<{ operatorId: string; companyId: string }> {
  const res = await apiFetch<{ success: boolean; data: { operatorId: string; companyId: string } }>('/api/operators/signup', {
    method: 'POST',
    body: JSON.stringify(params),
  });
  return res.data;
}

// ─── Operator Profile ─────────────────────────────────────────────────────────

export interface OperatorProfile {
  operatorId: string;
  name: string;
  email: string;
  companyId: string;
  companyName: string;
  logoUrl?: string | null;
}

export interface OperatorLoginParams {
  email: string;
  password: string;
}

export async function operatorLogin(params: OperatorLoginParams): Promise<OperatorProfile> {
  const res = await apiFetch<{ success: boolean; data: OperatorProfile }>('/api/operators/login', {
    method: 'POST',
    credentials: 'include',
    body: JSON.stringify(params),
  });
  return res.data;
}

export async function getOperatorMe(): Promise<OperatorProfile> {
  const res = await apiFetch<{ success: boolean; data: OperatorProfile }>('/api/operators/me', {
    credentials: 'include',
  });
  return res.data;
}

export async function operatorLogout(): Promise<void> {
  await apiFetch('/api/operators/logout', { method: 'POST', credentials: 'include' });
}

// ─── Operator Route Management ────────────────────────────────────────────────

export async function getOperatorRoutes(): Promise<ApiRoute[]> {
  const res = await apiFetch<{ success: boolean; data: ApiRoute[] }>('/api/operators/routes', {
    credentials: 'include',
  });
  return res.data;
}

export async function createOperatorRoute(origin: string, destination: string): Promise<ApiRoute> {
  const res = await apiFetch<{ success: boolean; data: ApiRoute }>('/api/operators/routes', {
    method: 'POST',
    credentials: 'include',
    body: JSON.stringify({ origin, destination }),
  });
  return res.data;
}
