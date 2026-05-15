export interface Company {
  id: string;
  name: string;
  logo: string | null;
}

export interface Bus {
  id: string;
  plateNumber: string;
  capacity: number;
  layout: '2x1' | '2x2';
  amenities: string[];
  company: Company;
}

export interface Route {
  id: string;
  origin: string;
  destination: string;
}

export interface Trip {
  id: string;
  route: Route;
  bus: Bus;
  departureTime: string;
  arrivalTime: string;
  price: number;
  availableSeats: number;
}

export interface Seat {
  number: string;
  status: 'available' | 'selected' | 'locked';
}

export interface Passenger {
  fullName: string;
  email: string;
  phone: string;
}

export interface Booking {
  id: string;
  bookingRef: string;
  trip: Trip;
  seats: string[];
  passenger: Passenger;
  totalAmount: number;
  status: 'PENDING' | 'PAID' | 'FAILED';
  mpesaRef?: string;
  createdAt: string;
}
