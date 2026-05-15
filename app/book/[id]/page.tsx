'use client';

import { useState, use, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Navbar } from '@/components/layout/Navbar';
import { getTrip, lockSeats, mapLayout, ApiTripDetail } from '@/lib/api';
import { formatTime, formatDuration, formatKES, formatDate } from '@/lib/utils';
import { Seat } from '@/lib/types';
import { ShieldCheck, Clock, MapPin, ChevronRight, Info } from 'lucide-react';
import { cn } from '@/lib/utils';

function SeatButton({ seat, onClick }: { seat: Seat; onClick: () => void }) {
  const base = 'w-9 h-9 rounded-md text-[11px] font-semibold transition-all border flex items-center justify-center';
  const styles = {
    available: 'bg-white border-gray-300 text-gray-700 hover:border-rose-400 hover:bg-rose-50 cursor-pointer',
    selected: 'bg-rose-500 border-rose-500 text-white cursor-pointer shadow-md scale-105',
    locked: 'bg-gray-100 border-gray-200 text-gray-300 cursor-not-allowed',
  };
  return (
    <button
      onClick={seat.status !== 'locked' ? onClick : undefined}
      className={cn(base, styles[seat.status])}
      title={seat.status === 'locked' ? 'Already booked' : `Seat ${seat.number}`}
    >
      {seat.number}
    </button>
  );
}

export default function BookPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();

  const [tripData, setTripData] = useState<ApiTripDetail | null>(null);
  const [seats, setSeats] = useState<Seat[]>([]);
  const [loadingTrip, setLoadingTrip] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [locking, setLocking] = useState(false);

  useEffect(() => {
    getTrip(id)
      .then(data => {
        setTripData(data);
        setSeats(data.seats.map(s => ({ number: s.number, status: s.status as 'available' | 'locked' })));
      })
      .catch(() => setError('Trip not found or no longer available.'))
      .finally(() => setLoadingTrip(false));
  }, [id]);

  if (loadingTrip) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-rose-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (error || !tripData) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center">
        <p className="text-gray-500">{error ?? 'Trip not found.'}</p>
      </div>
    );
  }

  const trip = {
    ...tripData,
    bus: {
      ...tripData.bus,
      layout: mapLayout(tripData.bus.layout),
      company: { id: tripData.bus.company.id, name: tripData.bus.company.name, logo: tripData.bus.company.logoUrl }
    }
  };
  const selected = seats.filter(s => s.status === 'selected');
  const total = selected.length * trip.price;

  function toggleSeat(number: string) {
    setSeats(prev => prev.map(s =>
      s.number === number && s.status !== 'locked'
        ? { ...s, status: s.status === 'selected' ? 'available' : 'selected' }
        : s
    ));
  }

  async function handleCheckout() {
    if (selected.length === 0) return;
    setLocking(true);
    try {
      const { lockToken } = await lockSeats(id, selected.map(s => s.number));
      sessionStorage.setItem('booking_draft', JSON.stringify({
        tripId: id,
        seats: selected.map(s => s.number),
        totalAmount: total,
        lockToken,
      }));
      router.push('/checkout');
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to lock seats. Please try again.');
      setLocking(false);
    }
  }

  const rows = trip.bus.layout === '2x2'
    ? Math.ceil(trip.bus.capacity / 4)
    : Math.ceil(trip.bus.capacity / 3);

  function getSeat(row: number, col: string) {
    return seats.find(s => s.number === `${row}${col}`);
  }

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <Navbar />
      <main className="flex-1 pt-24 pb-16">
        <div className="max-w-6xl mx-auto px-6">

          <div className="flex items-center gap-2 text-sm text-gray-400 mb-6">
            <button onClick={() => router.back()} className="hover:text-gray-700 transition">Trips</button>
            <ChevronRight className="w-3.5 h-3.5" />
            <span className="text-gray-700 font-medium">{trip.route.origin} → {trip.route.destination}</span>
          </div>

          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 mb-6 flex flex-wrap gap-4 items-center justify-between">
            <div>
              <h1 className="text-xl font-bold text-gray-900">{trip.route.origin} → {trip.route.destination}</h1>
              <p className="text-sm text-gray-500 mt-0.5">{trip.bus.company.name} · {trip.bus.plateNumber}</p>
            </div>
            <div className="flex gap-6 text-sm">
              <div className="flex items-center gap-1.5 text-gray-600">
                <Clock className="w-4 h-4 text-rose-400" />
                {formatTime(trip.departureTime)} – {formatTime(trip.arrivalTime)}
                <span className="text-gray-400">({formatDuration(trip.departureTime, trip.arrivalTime)})</span>
              </div>
              <div className="flex items-center gap-1.5 text-gray-600">
                <MapPin className="w-4 h-4 text-rose-400" />
                {formatDate(trip.departureTime)}
              </div>
            </div>
            <div className="flex items-center gap-1.5 text-sm text-gray-500">
              <ShieldCheck className="w-4 h-4 text-rose-500" />
              Verified operator
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Seat Map */}
            <div className="lg:col-span-2 bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
              <h2 className="font-semibold text-gray-900 mb-1">Select your seats</h2>
              <p className="text-sm text-gray-400 mb-6">Click an available seat to select it</p>

              <div className="flex gap-5 mb-8 text-[12px] text-gray-500">
                <div className="flex items-center gap-2"><div className="w-6 h-6 rounded border border-gray-300 bg-white" />Available</div>
                <div className="flex items-center gap-2"><div className="w-6 h-6 rounded border border-rose-500 bg-rose-500" />Selected</div>
                <div className="flex items-center gap-2"><div className="w-6 h-6 rounded border border-gray-200 bg-gray-100" />Taken</div>
              </div>

              <div className="flex justify-center">
                <div className="w-full max-w-xs">
                  <div className="flex justify-end mb-4 pr-2">
                    <div className="flex flex-col items-center gap-1">
                      <div className="w-8 h-8 rounded-full border-4 border-gray-300 flex items-center justify-center">
                        <div className="w-2 h-2 rounded-full bg-gray-300" />
                      </div>
                      <span className="text-[10px] text-gray-400 font-medium">DRIVER</span>
                    </div>
                  </div>

                  <div className={`grid gap-2 mb-2 ${trip.bus.layout === '2x2' ? 'grid-cols-[1fr_1fr_12px_1fr_1fr]' : 'grid-cols-[1fr_1fr_12px_1fr]'}`}>
                    {trip.bus.layout === '2x2' ? (
                      <><span className="text-[10px] text-center text-gray-400 font-bold">A</span><span className="text-[10px] text-center text-gray-400 font-bold">B</span><span /><span className="text-[10px] text-center text-gray-400 font-bold">C</span><span className="text-[10px] text-center text-gray-400 font-bold">D</span></>
                    ) : (
                      <><span className="text-[10px] text-center text-gray-400 font-bold">A</span><span className="text-[10px] text-center text-gray-400 font-bold">B</span><span /><span className="text-[10px] text-center text-gray-400 font-bold">C</span></>
                    )}
                  </div>

                  <div className="space-y-2">
                    {Array.from({ length: rows }, (_, i) => i + 1).map(row => {
                      if (trip.bus.layout === '2x2') {
                        const a = getSeat(row, 'A'); const b = getSeat(row, 'B');
                        const c = getSeat(row, 'C'); const d = getSeat(row, 'D');
                        return (
                          <div key={row} className="grid grid-cols-[1fr_1fr_12px_1fr_1fr] gap-2 items-center">
                            {a && <SeatButton seat={a} onClick={() => toggleSeat(a.number)} />}
                            {b && <SeatButton seat={b} onClick={() => toggleSeat(b.number)} />}
                            <span className="text-[10px] text-center text-gray-300">{row}</span>
                            {c && <SeatButton seat={c} onClick={() => toggleSeat(c.number)} />}
                            {d && <SeatButton seat={d} onClick={() => toggleSeat(d.number)} />}
                          </div>
                        );
                      } else {
                        const a = getSeat(row, 'A'); const b = getSeat(row, 'B'); const c = getSeat(row, 'C');
                        return (
                          <div key={row} className="grid grid-cols-[1fr_1fr_12px_1fr] gap-2 items-center">
                            {a && <SeatButton seat={a} onClick={() => toggleSeat(a.number)} />}
                            {b && <SeatButton seat={b} onClick={() => toggleSeat(b.number)} />}
                            <span className="text-[10px] text-center text-gray-300">{row}</span>
                            {c && <SeatButton seat={c} onClick={() => toggleSeat(c.number)} />}
                          </div>
                        );
                      }
                    })}
                  </div>
                  <div className="mt-4 border-t-4 border-gray-200 rounded-b-xl h-3" />
                </div>
              </div>
            </div>

            {/* Booking Summary */}
            <div className="lg:col-span-1">
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 sticky top-28">
                <h2 className="font-semibold text-gray-900 mb-4">Booking summary</h2>
                <div className="space-y-3 text-sm text-gray-600 mb-4">
                  <div className="flex justify-between"><span>Route</span><span className="font-medium text-gray-900">{trip.route.origin} → {trip.route.destination}</span></div>
                  <div className="flex justify-between"><span>Operator</span><span className="font-medium text-gray-900">{trip.bus.company.name}</span></div>
                  <div className="flex justify-between"><span>Plate</span><span className="font-medium text-gray-900">{trip.bus.plateNumber}</span></div>
                  <div className="flex justify-between"><span>Departure</span><span className="font-medium text-gray-900">{formatTime(trip.departureTime)}</span></div>
                  <div className="flex justify-between"><span>Selected seats</span><span className="font-medium text-gray-900">{selected.length > 0 ? selected.map(s => s.number).join(', ') : '—'}</span></div>
                  <div className="flex justify-between"><span>Price per seat</span><span className="font-medium text-gray-900">{formatKES(trip.price)}</span></div>
                </div>
                <div className="border-t border-gray-100 pt-4 mb-4">
                  <div className="flex justify-between items-center">
                    <span className="font-semibold text-gray-900">Total</span>
                    <span className="font-bold text-xl text-gray-900">{formatKES(total)}</span>
                  </div>
                  {selected.length > 0 && <p className="text-xs text-gray-400 mt-1">{selected.length} seat{selected.length !== 1 ? 's' : ''} × {formatKES(trip.price)}</p>}
                </div>
                {selected.length === 0 && (
                  <div className="flex items-start gap-2 bg-amber-50 text-amber-700 rounded-lg p-3 text-xs mb-4">
                    <Info className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
                    Select at least one seat to continue.
                  </div>
                )}
                <button
                  onClick={handleCheckout}
                  disabled={selected.length === 0 || locking}
                  className="w-full bg-rose-500 hover:bg-rose-600 disabled:bg-gray-200 disabled:text-gray-400 disabled:cursor-not-allowed text-white font-semibold py-3.5 rounded-xl transition-all active:scale-95"
                >
                  {locking ? 'Locking seats...' : `Checkout · ${formatKES(total)}`}
                </button>
                <p className="text-[11px] text-gray-400 text-center mt-3">Seats are held for 10 minutes after checkout</p>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
