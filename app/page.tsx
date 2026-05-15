'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { Navbar } from '@/components/layout/Navbar';
import { Footer } from '@/components/layout/Footer';
import { SearchForm } from '@/components/search/SearchForm';
import { CategoryFilters } from '@/components/search/CategoryFilters';
import { TripCard } from '@/components/trips/TripCard';
import { getTrips, mapLayout } from '@/lib/api';
import { Trip } from '@/lib/types';

function HomeContent() {
  const searchParams = useSearchParams();
  const [trips, setTrips] = useState<Trip[]>([]);
  const [loading, setLoading] = useState(true);
  const [hasSearched, setHasSearched] = useState(false);

  const origin = searchParams.get('origin') || '';
  const destination = searchParams.get('destination') || '';
  const date = searchParams.get('date') || '';

  useEffect(() => {
    setLoading(true);
    setHasSearched(!!(origin || destination || date));

    getTrips({ origin: origin || undefined, destination: destination || undefined, date: date || undefined })
      .then(({ trips: apiTrips }) => {
        // Map API shape → frontend Trip type
        const mapped: Trip[] = apiTrips.map(t => ({
          id: t.id,
          route: t.route,
          bus: {
            ...t.bus,
            layout: mapLayout(t.bus.layout),
            company: { id: t.bus.company.id, name: t.bus.company.name, logo: t.bus.company.logoUrl }
          },
          departureTime: t.departureTime,
          arrivalTime: t.arrivalTime,
          price: t.price,
          availableSeats: t.availableSeats,
        }));
        setTrips(mapped);
      })
      .catch(err => {
        console.error('Failed to load trips:', err);
        setTrips([]);
      })
      .finally(() => setLoading(false));
  }, [origin, destination, date]);

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <div className="pt-20 bg-gradient-to-b from-rose-50 via-white to-white">
        <div className="max-w-5xl mx-auto px-6 py-12 md:py-16">
          <div className="text-center mb-8">
            <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-3 tracking-tight">Find your perfect ride</h1>
            <p className="text-gray-500 text-lg">Book trusted bus operators across Kenya — seamlessly.</p>
          </div>
          <SearchForm defaultFrom={origin} defaultTo={destination} defaultDate={date} />
        </div>
      </div>
      <CategoryFilters onChange={() => { setLoading(true); setTimeout(() => setLoading(false), 800); }} />
      <main className="flex-1 max-w-7xl mx-auto w-full px-6 py-8">
        {hasSearched && !loading && (
          <div className="mb-6">
            <h2 className="text-xl font-semibold text-gray-900">
              {trips.length} trips found
              {origin && destination && <span className="font-normal text-gray-500"> · {origin} → {destination}</span>}
            </h2>
          </div>
        )}
        {!hasSearched && !loading && (
          <div className="mb-6">
            <h2 className="text-xl font-semibold text-gray-900">Popular routes</h2>
            <p className="text-sm text-gray-400 mt-1">Search above to filter by route or date</p>
          </div>
        )}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-x-4 gap-y-8">
          {loading
            ? Array.from({ length: 8 }).map((_, i) => <TripCard key={i} skeleton />)
            : trips.map(trip => <TripCard key={trip.id} trip={trip} />)
          }
        </div>
      </main>
      <Footer />
    </div>
  );
}

export default function HomePage() {
  return <Suspense><HomeContent /></Suspense>;
}
