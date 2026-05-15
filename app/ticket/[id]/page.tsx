'use client';

import { useState, useEffect, use } from 'react';
import { useRouter } from 'next/navigation';
import { getBooking, pollBookingStatus, ApiBooking } from '@/lib/api';
import { formatTime, formatDate, formatKES } from '@/lib/utils';
import { CheckCircle, XCircle, Download, Search, MapPin, Clock, User, Phone, Mail, Bus } from 'lucide-react';

export default function TicketPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params); // id is the bookingRef
  const router = useRouter();
  const [booking, setBooking] = useState<ApiBooking | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    // VULN-07 Fix: Retrieve the email used for booking
    const email = sessionStorage.getItem('booking_email');
    if (!email) {
      setError(true);
      return;
    }

    // Initial fetch
    getBooking(id, email)
      .then(b => {
        setBooking(b);
        // If still pending, start polling
        if (b.status === 'PENDING') {
          pollBookingStatus(id, email, updated => setBooking(updated));
        }
      })
      .catch(() => setError(true));
  }, [id]);

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-500 mb-4">Booking not found.</p>
          <button onClick={() => router.push('/')} className="text-rose-500 underline">Go home</button>
        </div>
      </div>
    );
  }

  if (!booking) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-rose-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  // --- PENDING ---
  if (booking.status === 'PENDING') {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 px-6">
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-10 max-w-md w-full text-center">
          <div className="w-16 h-16 mx-auto mb-5 rounded-full bg-amber-50 flex items-center justify-center">
            <Phone className="w-8 h-8 text-amber-500 animate-pulse" />
          </div>
          <h1 className="text-xl font-bold text-gray-900 mb-2">Awaiting M-Pesa PIN</h1>
          <p className="text-gray-500 text-sm mb-6">
            An STK push has been sent to <span className="font-semibold text-gray-900">{booking.passenger.phone}</span>.
            Enter your M-Pesa PIN to complete payment.
          </p>
          <div className="flex items-center justify-center gap-1.5 mb-6">
            {[0, 1, 2].map(i => (
              <div key={i} className="w-2 h-2 bg-rose-400 rounded-full animate-bounce" style={{ animationDelay: `${i * 0.15}s` }} />
            ))}
          </div>
          <p className="text-xs text-gray-400">Checking payment status every 3 seconds…</p>
          <div className="mt-4 bg-gray-50 rounded-xl p-4 text-sm text-gray-600 text-left space-y-1.5">
            <div className="flex justify-between">
              <span className="text-gray-400">Route</span>
              <span className="font-medium">{booking.trip.route.origin} → {booking.trip.route.destination}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">Amount</span>
              <span className="font-semibold text-gray-900">{formatKES(booking.totalAmount)}</span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // --- FAILED ---
  if (booking.status === 'FAILED') {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 px-6">
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-10 max-w-md w-full text-center">
          <div className="w-16 h-16 mx-auto mb-5 rounded-full bg-red-50 flex items-center justify-center">
            <XCircle className="w-9 h-9 text-red-500" />
          </div>
          <h1 className="text-xl font-bold text-gray-900 mb-2">Payment Failed</h1>
          <p className="text-gray-500 text-sm mb-8">
            Your M-Pesa payment was not completed. Your seats have been released.
          </p>
          <button
            onClick={() => router.push('/')}
            className="w-full bg-rose-500 hover:bg-rose-600 text-white font-semibold py-3.5 rounded-xl transition-all flex items-center justify-center gap-2"
          >
            <Search className="w-4 h-4" />
            Start New Search
          </button>
          <button
            onClick={() => router.back()}
            className="w-full mt-3 border border-gray-200 text-gray-700 font-medium py-3.5 rounded-xl hover:bg-gray-50 transition-all"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  // --- PAID: Boarding Pass ---
  return (
    <div className="min-h-screen bg-gray-50 py-12 px-6">
      <div className="max-w-2xl mx-auto">

        <div className="text-center mb-8">
          <div className="w-14 h-14 mx-auto mb-4 rounded-full bg-green-50 flex items-center justify-center">
            <CheckCircle className="w-8 h-8 text-green-500" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-1">You&apos;re booked!</h1>
          <p className="text-gray-500 text-sm">Ticket sent to {booking.passenger.email}</p>
        </div>

        <div className="bg-white rounded-3xl shadow-xl overflow-hidden border border-gray-100" id="boarding-pass">

          <div className="bg-rose-500 px-8 py-5 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 bg-white/20 rounded-full flex items-center justify-center">
                <span className="text-white font-bold text-xs">B</span>
              </div>
              <span className="text-white font-bold text-lg tracking-tight">busbnb</span>
            </div>
            <div className="text-right">
              <p className="text-rose-200 text-xs font-medium uppercase tracking-widest">Booking Ref</p>
              <p className="text-white font-bold text-lg tracking-wider">{booking.bookingRef}</p>
            </div>
          </div>

          <div className="px-8 py-6 flex items-center justify-between border-b border-gray-100">
            <div className="text-center">
              <p className="text-4xl font-black text-gray-900">{booking.trip.route.origin.slice(0, 3).toUpperCase()}</p>
              <p className="text-sm text-gray-400 mt-1 flex items-center gap-1"><MapPin className="w-3 h-3" /> {booking.trip.route.origin}</p>
            </div>
            <div className="flex-1 flex flex-col items-center px-4">
              <div className="flex items-center gap-3 w-full">
                <div className="flex-1 h-px bg-gray-200" />
                <Bus className="w-5 h-5 text-rose-400" />
                <div className="flex-1 h-px bg-gray-200" />
              </div>
              <p className="text-xs text-gray-400 mt-2">
                {(() => {
                  const ms = new Date(booking.trip.arrivalTime).getTime() - new Date(booking.trip.departureTime).getTime();
                  const h = Math.floor(ms / 3600000);
                  const m = Math.floor((ms % 3600000) / 60000);
                  return `${h}h ${m}m`;
                })()}
              </p>
            </div>
            <div className="text-center">
              <p className="text-4xl font-black text-gray-900">{booking.trip.route.destination.slice(0, 3).toUpperCase()}</p>
              <p className="text-sm text-gray-400 mt-1 flex items-center gap-1"><MapPin className="w-3 h-3" /> {booking.trip.route.destination}</p>
            </div>
          </div>

          <div className="px-8 py-6 grid grid-cols-3 gap-6 border-b border-gray-100">
            <div>
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1 flex items-center gap-1"><Clock className="w-3 h-3" /> Departure</p>
              <p className="font-bold text-gray-900 text-lg">{formatTime(booking.trip.departureTime)}</p>
              <p className="text-xs text-gray-400">{formatDate(booking.trip.departureTime)}</p>
            </div>
            <div>
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Seats</p>
              <p className="font-bold text-gray-900 text-lg">{booking.seats.join(', ')}</p>
              <p className="text-xs text-gray-400">{booking.seats.length} seat{booking.seats.length !== 1 ? 's' : ''}</p>
            </div>
            <div>
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Operator</p>
              <p className="font-bold text-gray-900 text-sm">{booking.trip.bus.company.name}</p>
              <p className="text-xs text-gray-400">{booking.trip.bus.plateNumber}</p>
            </div>
          </div>

          <div className="px-8 py-6 grid grid-cols-2 gap-6 border-b border-gray-100">
            <div>
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-3">Passenger</p>
              <div className="space-y-2 text-sm">
                <div className="flex items-center gap-2 text-gray-700"><User className="w-3.5 h-3.5 text-gray-400" /> {booking.passenger.fullName}</div>
                <div className="flex items-center gap-2 text-gray-700"><Mail className="w-3.5 h-3.5 text-gray-400" /> {booking.passenger.email}</div>
                <div className="flex items-center gap-2 text-gray-700"><Phone className="w-3.5 h-3.5 text-gray-400" /> {booking.passenger.phone}</div>
              </div>
            </div>
            <div>
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-3">Payment</p>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between"><span className="text-gray-400">Amount</span><span className="font-bold text-gray-900">{formatKES(booking.totalAmount)}</span></div>
                <div className="flex justify-between"><span className="text-gray-400">Method</span><span className="text-gray-700">M-Pesa</span></div>
                {booking.mpesaRef && (
                  <div className="flex justify-between"><span className="text-gray-400">M-Pesa Ref</span><span className="font-mono font-bold text-green-600">{booking.mpesaRef}</span></div>
                )}
              </div>
            </div>
          </div>

          <div className="bg-gray-50 px-8 py-4 flex items-center justify-between">
            <div className="flex gap-1">
              {Array.from({ length: 40 }).map((_, i) => (
                <div key={i} className={`w-1 rounded-full ${i % 2 === 0 ? 'h-4 bg-gray-900' : 'h-2 bg-gray-400'}`} />
              ))}
            </div>
            <p className="text-xs text-gray-400 font-mono">{booking.bookingRef}</p>
          </div>
        </div>

        <div className="mt-6 flex gap-4">
          <button
            onClick={() => window.print()}
            className="flex-1 border border-gray-200 text-gray-700 font-medium py-3.5 rounded-xl hover:bg-gray-50 transition flex items-center justify-center gap-2"
          >
            <Download className="w-4 h-4" /> Download Ticket
          </button>
          <button
            onClick={() => router.push('/')}
            className="flex-1 bg-rose-500 hover:bg-rose-600 text-white font-semibold py-3.5 rounded-xl transition flex items-center justify-center gap-2"
          >
            <Search className="w-4 h-4" /> Book Another Trip
          </button>
        </div>
      </div>
    </div>
  );
}
