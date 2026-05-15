'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { MapPin, Calendar, Users, Search } from 'lucide-react';

const CITIES = ['Nairobi', 'Mombasa', 'Kisumu', 'Nakuru', 'Eldoret', 'Malindi', 'Nyeri', 'Kampala', 'Machakos'];

export function SearchForm({ defaultFrom = '', defaultTo = '', defaultDate = '' }: {
  defaultFrom?: string;
  defaultTo?: string;
  defaultDate?: string;
}) {
  const router = useRouter();
  const [from, setFrom] = useState(defaultFrom);
  const [to, setTo] = useState(defaultTo);
  const [date, setDate] = useState(defaultDate);
  const [passengers, setPassengers] = useState(1);

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    const params = new URLSearchParams();
    if (from) params.set('origin', from);
    if (to) params.set('destination', to);
    if (date) params.set('date', date);
    if (passengers > 1) params.set('passengers', String(passengers));
    router.push(`/?${params.toString()}`);
  }

  return (
    <form
      onSubmit={handleSearch}
      className="bg-white rounded-2xl shadow-2xl border border-gray-100 flex flex-col md:flex-row items-stretch md:items-center divide-y md:divide-y-0 md:divide-x divide-gray-200 overflow-hidden"
    >
      {/* From */}
      <div className="flex-1 flex items-center gap-3 px-5 py-4 hover:bg-gray-50 transition">
        <MapPin className="w-5 h-5 text-rose-400 flex-shrink-0" />
        <div className="flex-1 min-w-0">
          <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-0.5">From</label>
          <input
            list="origins"
            value={from}
            onChange={e => setFrom(e.target.value)}
            placeholder="Nairobi"
            className="w-full text-sm font-medium text-gray-900 bg-transparent outline-none placeholder:text-gray-400"
          />
          <datalist id="origins">{CITIES.map(c => <option key={c} value={c} />)}</datalist>
        </div>
      </div>

      {/* To */}
      <div className="flex-1 flex items-center gap-3 px-5 py-4 hover:bg-gray-50 transition">
        <MapPin className="w-5 h-5 text-rose-400 flex-shrink-0" />
        <div className="flex-1 min-w-0">
          <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-0.5">To</label>
          <input
            list="destinations"
            value={to}
            onChange={e => setTo(e.target.value)}
            placeholder="Mombasa"
            className="w-full text-sm font-medium text-gray-900 bg-transparent outline-none placeholder:text-gray-400"
          />
          <datalist id="destinations">{CITIES.map(c => <option key={c} value={c} />)}</datalist>
        </div>
      </div>

      {/* Date */}
      <div className="flex-1 flex items-center gap-3 px-5 py-4 hover:bg-gray-50 transition">
        <Calendar className="w-5 h-5 text-rose-400 flex-shrink-0" />
        <div className="flex-1 min-w-0">
          <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-0.5">Date</label>
          <input
            type="date"
            value={date}
            onChange={e => setDate(e.target.value)}
            min={new Date().toISOString().split('T')[0]}
            className="w-full text-sm font-medium text-gray-900 bg-transparent outline-none"
          />
        </div>
      </div>

      {/* Passengers */}
      <div className="flex items-center gap-3 px-5 py-4 hover:bg-gray-50 transition">
        <Users className="w-5 h-5 text-rose-400 flex-shrink-0" />
        <div>
          <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-0.5">Seats</label>
          <div className="flex items-center gap-3">
            <button type="button" onClick={() => setPassengers(p => Math.max(1, p - 1))}
              className="w-6 h-6 rounded-full border border-gray-300 flex items-center justify-center text-gray-600 hover:border-gray-500 text-sm transition">−</button>
            <span className="text-sm font-semibold text-gray-900 w-4 text-center">{passengers}</span>
            <button type="button" onClick={() => setPassengers(p => Math.min(10, p + 1))}
              className="w-6 h-6 rounded-full border border-gray-300 flex items-center justify-center text-gray-600 hover:border-gray-500 text-sm transition">+</button>
          </div>
        </div>
      </div>

      {/* Submit */}
      <button type="submit"
        className="bg-rose-500 hover:bg-rose-600 active:scale-95 text-white px-8 py-5 flex items-center justify-center gap-2 font-semibold text-sm transition-all">
        <Search className="w-4 h-4" />
        <span>Search</span>
      </button>
    </form>
  );
}
