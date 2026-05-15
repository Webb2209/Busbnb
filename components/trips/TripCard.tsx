'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Star, ShieldCheck, Heart, Wifi, Zap, Wind, Coffee } from 'lucide-react';
import { Trip } from '@/lib/types';
import { formatTime, formatDuration, formatKES } from '@/lib/utils';

const AMENITY_ICONS: Record<string, React.ReactNode> = {
  'WiFi': <Wifi className="w-3 h-3" />,
  'AC': <Wind className="w-3 h-3" />,
  'USB Charging': <Zap className="w-3 h-3" />,
  'Meals': <Coffee className="w-3 h-3" />,
};

interface TripCardProps {
  trip: Trip;
  skeleton?: false;
}
interface SkeletonProps {
  skeleton: true;
}

export function TripCard(props: TripCardProps | SkeletonProps) {
  const [faved, setFaved] = useState(false);

  if ('skeleton' in props && props.skeleton) {
    return (
      <div className="flex flex-col gap-3">
        <div className="skeleton w-full aspect-[4/3] rounded-xl" />
        <div className="space-y-2 px-1">
          <div className="skeleton h-3.5 w-4/5 rounded" />
          <div className="skeleton h-3 w-3/5 rounded" />
          <div className="skeleton h-3 w-2/5 rounded" />
        </div>
      </div>
    );
  }

  const { trip } = props as TripCardProps;
  const imageUrl = `https://picsum.photos/seed/${trip.id}/800/600`;

  return (
    <Link href={`/book/${trip.id}`} className="group flex flex-col gap-3 cursor-pointer">
      {/* Image */}
      <div className="relative w-full aspect-[4/3] rounded-xl overflow-hidden bg-gray-100">
        <img
          src={imageUrl}
          alt={`${trip.route.origin} to ${trip.route.destination}`}
          className="object-cover w-full h-full group-hover:scale-105 transition-transform duration-500 ease-out"
        />

        {/* Verified badge */}
        <div className="absolute top-3 left-3 bg-white/90 backdrop-blur-sm text-gray-900 text-[10px] font-bold px-2 py-1 rounded-md shadow-sm flex items-center gap-1">
          <ShieldCheck className="w-3 h-3 text-rose-500" /> Verified
        </div>

        {/* Favourite */}
        <button
          onClick={e => { e.preventDefault(); setFaved(f => !f); }}
          className="absolute top-3 right-3 p-1.5 transition-transform hover:scale-110"
        >
          <Heart
            className="w-5 h-5 drop-shadow-md transition-colors"
            fill={faved ? '#F43F5E' : 'rgba(0,0,0,0.35)'}
            stroke={faved ? '#F43F5E' : 'white'}
            strokeWidth={2}
          />
        </button>

        {/* Low seats warning */}
        {trip.availableSeats <= 5 && (
          <div className="absolute bottom-3 left-3 bg-rose-500 text-white text-[10px] font-bold px-2 py-1 rounded-md">
            Only {trip.availableSeats} left!
          </div>
        )}
      </div>

      {/* Info */}
      <div className="px-0.5">
        <div className="flex justify-between items-start">
          <h3 className="font-semibold text-gray-900 text-[15px] truncate pr-4">
            {trip.route.origin} → {trip.route.destination}
          </h3>
          <div className="flex items-center gap-0.5 text-[13px] text-gray-900 flex-shrink-0">
            <Star className="w-3 h-3 fill-current" /> 4.8
          </div>
        </div>

        <p className="text-[13px] text-gray-500 mt-0.5">
          {trip.bus.company.name} · {trip.bus.layout === '2x1' ? '2×1 VIP' : '2×2 Standard'}
        </p>

        <p className="text-[13px] text-gray-500">
          {formatTime(trip.departureTime)} – {formatTime(trip.arrivalTime)}
          <span className="ml-1 text-gray-400">({formatDuration(trip.departureTime, trip.arrivalTime)})</span>
        </p>

        {/* Amenity pills */}
        <div className="flex gap-1.5 mt-1.5 flex-wrap">
          {trip.bus.amenities.slice(0, 3).map(a => (
            <span key={a} className="flex items-center gap-1 text-[10px] text-gray-500 bg-gray-100 px-1.5 py-0.5 rounded-full">
              {AMENITY_ICONS[a]} {a}
            </span>
          ))}
        </div>

        <p className="mt-2 text-[14px] text-gray-900">
          <span className="font-semibold">{formatKES(trip.price)}</span>
          <span className="font-light"> per seat</span>
        </p>
      </div>
    </Link>
  );
}
