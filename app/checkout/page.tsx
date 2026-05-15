'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Navbar } from '@/components/layout/Navbar';
import { getTrip, createBooking, mapLayout } from '@/lib/api';
import { formatTime, formatKES, formatDate } from '@/lib/utils';
import { ShieldCheck, Phone, User, Mail, ChevronRight, Lock } from 'lucide-react';
import { Trip } from '@/lib/types';

interface Draft {
  tripId: string;
  seats: string[];
  totalAmount: number;
  lockToken: string;
}

export default function CheckoutPage() {
  const router = useRouter();
  const [draft, setDraft] = useState<Draft | null>(null);
  const [trip, setTrip] = useState<Trip | null>(null);

  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    const raw = sessionStorage.getItem('booking_draft');
    if (!raw) { router.replace('/'); return; }
    const d: Draft = JSON.parse(raw);
    setDraft(d);
    getTrip(d.tripId)
      .then(apiTrip => {
        // Map to the Trip shape the rest of the component expects
        const mapped: Trip = {
          id: apiTrip.id,
          route: apiTrip.route,
          bus: {
            ...apiTrip.bus,
            layout: mapLayout(apiTrip.bus.layout),
            company: { id: apiTrip.bus.company.id, name: apiTrip.bus.company.name, logo: apiTrip.bus.company.logoUrl }
          },
          departureTime: apiTrip.departureTime,
          arrivalTime: apiTrip.arrivalTime,
          price: apiTrip.price,
          availableSeats: 0,
        };
        setTrip(mapped);
      })
      .catch(() => router.replace('/'));
  }, [router]);

  function validate() {
    const e: Record<string, string> = {};
    if (!fullName.trim()) e.fullName = 'Full name is required';
    if (!email.trim() || !/\S+@\S+\.\S+/.test(email)) e.email = 'Valid email is required';
    if (!phone.trim() || !/^(07|01)\d{8}$/.test(phone.replace(/\s/g, '')))
      e.phone = 'Enter a valid Safaricom number (e.g. 0712345678)';
    return e;
  }

  async function handlePay(e: React.FormEvent) {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length > 0) { setErrors(errs); return; }
    setSubmitting(true);

    try {
      const result = await createBooking({
        tripId: draft!.tripId,
        lockToken: draft!.lockToken,
        passenger: { fullName, email, phone },
      });

      // Store bookingRef and email so the ticket page can poll by ref and verify email
      sessionStorage.setItem('booking_ref', result.bookingRef);
      sessionStorage.setItem('booking_email', email); // VULN-07 Fix
      sessionStorage.removeItem('booking_draft');

      router.push(`/ticket/${result.bookingRef}`);
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Booking failed. Please try again.');
      setSubmitting(false);
    }
  }

  if (!draft || !trip) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-rose-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const InputClass = (field: string) =>
    `w-full border ${errors[field] ? 'border-rose-400 bg-rose-50' : 'border-gray-200'} rounded-xl px-4 py-3 text-sm text-gray-900 outline-none focus:ring-2 focus:ring-rose-300 focus:border-transparent transition placeholder:text-gray-400`;

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <Navbar />

      <main className="flex-1 pt-24 pb-16">
        <div className="max-w-5xl mx-auto px-6">

          {/* Breadcrumb */}
          <div className="flex items-center gap-2 text-sm text-gray-400 mb-6">
            <button onClick={() => router.back()} className="hover:text-gray-700 transition">Seats</button>
            <ChevronRight className="w-3.5 h-3.5" />
            <span className="text-gray-700 font-medium">Checkout</span>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">

            {/* Left: Passenger form */}
            <div className="lg:col-span-3">
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 mb-6">
                <h2 className="font-bold text-gray-900 text-lg mb-1">Passenger details</h2>
                <p className="text-sm text-gray-400 mb-6">Your ticket will be sent to this email</p>

                <form onSubmit={handlePay} className="space-y-4">
                  {/* Full Name */}
                  <div>
                    <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Full Name</label>
                    <div className="relative">
                      <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-300" />
                      <input
                        value={fullName}
                        onChange={e => { setFullName(e.target.value); setErrors(p => ({ ...p, fullName: '' })); }}
                        placeholder="John Kamau"
                        className={`${InputClass('fullName')} pl-10`}
                      />
                    </div>
                    {errors.fullName && <p className="text-xs text-rose-500 mt-1">{errors.fullName}</p>}
                  </div>

                  {/* Email */}
                  <div>
                    <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Email Address</label>
                    <div className="relative">
                      <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-300" />
                      <input
                        type="email"
                        value={email}
                        onChange={e => { setEmail(e.target.value); setErrors(p => ({ ...p, email: '' })); }}
                        placeholder="john@example.com"
                        className={`${InputClass('email')} pl-10`}
                      />
                    </div>
                    {errors.email && <p className="text-xs text-rose-500 mt-1">{errors.email}</p>}
                  </div>

                  {/* Phone */}
                  <div>
                    <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">M-Pesa Phone Number</label>
                    <div className="relative">
                      <Phone className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-300" />
                      <input
                        type="tel"
                        value={phone}
                        onChange={e => { setPhone(e.target.value); setErrors(p => ({ ...p, phone: '' })); }}
                        placeholder="0712 345 678"
                        className={`${InputClass('phone')} pl-10`}
                      />
                    </div>
                    {errors.phone && <p className="text-xs text-rose-500 mt-1">{errors.phone}</p>}
                    <p className="text-[11px] text-gray-400 mt-1.5">You'll receive an M-Pesa STK push to complete payment</p>
                  </div>

                  {/* Submit */}
                  <button
                    type="submit"
                    disabled={submitting}
                    className="w-full bg-rose-500 hover:bg-rose-600 disabled:opacity-60 text-white font-semibold py-4 rounded-xl transition-all active:scale-95 flex items-center justify-center gap-2 mt-2"
                  >
                    {submitting ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                        Initiating M-Pesa...
                      </>
                    ) : (
                      <>
                        <Lock className="w-4 h-4" />
                        Pay {formatKES(draft.totalAmount)} via M-Pesa
                      </>
                    )}
                  </button>
                </form>
              </div>

              {/* Security note */}
              <div className="flex items-center gap-2 text-xs text-gray-400">
                <ShieldCheck className="w-4 h-4 text-green-500" />
                Your payment is secured by Safaricom M-Pesa
              </div>
            </div>

            {/* Right: Order summary */}
            <div className="lg:col-span-2">
              <div className="bg-gray-900 text-white rounded-2xl p-6 sticky top-28">
                <div className="flex items-center gap-2 mb-4">
                  <div className="w-6 h-6 bg-rose-500 rounded-full flex items-center justify-center">
                    <span className="text-white font-bold text-xs">B</span>
                  </div>
                  <span className="font-bold text-sm">busbnb</span>
                </div>

                <div className="border-t border-white/10 pt-4 mb-4">
                  <h3 className="font-semibold text-white text-base mb-3">Order Summary</h3>

                  <div className="space-y-2.5 text-sm">
                    <div className="flex justify-between text-gray-400">
                      <span>Route</span>
                      <span className="text-white font-medium">{trip.route.origin} → {trip.route.destination}</span>
                    </div>
                    <div className="flex justify-between text-gray-400">
                      <span>Operator</span>
                      <span className="text-white font-medium">{trip.bus.company.name}</span>
                    </div>
                    <div className="flex justify-between text-gray-400">
                      <span>Departure</span>
                      <span className="text-white font-medium">{formatTime(trip.departureTime)} · {formatDate(trip.departureTime)}</span>
                    </div>
                    <div className="flex justify-between text-gray-400">
                      <span>Seats</span>
                      <span className="text-white font-medium">{draft.seats.join(', ')}</span>
                    </div>
                    <div className="flex justify-between text-gray-400">
                      <span>{draft.seats.length} seat{draft.seats.length !== 1 ? 's' : ''} × {formatKES(trip.price)}</span>
                      <span className="text-white font-medium">{formatKES(draft.totalAmount)}</span>
                    </div>
                  </div>
                </div>

                <div className="border-t border-white/10 pt-4">
                  <div className="flex justify-between items-center">
                    <span className="text-white font-semibold">Total</span>
                    <span className="text-white font-bold text-2xl">{formatKES(draft.totalAmount)}</span>
                  </div>
                </div>

                <div className="mt-4 bg-white/5 rounded-xl p-3 text-xs text-gray-400 flex items-start gap-2">
                  <Phone className="w-3.5 h-3.5 text-green-400 flex-shrink-0 mt-0.5" />
                  M-Pesa STK push will be sent to your phone. Enter your PIN to confirm.
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
