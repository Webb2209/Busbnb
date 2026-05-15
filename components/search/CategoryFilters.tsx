'use client';

import { useState } from 'react';
import { Bus, Star, Bed, Sparkles, Zap, Flame } from 'lucide-react';

const categories = [
  { name: 'Luxury', icon: <Star className="w-6 h-6" /> },
  { name: 'Standard', icon: <Bus className="w-6 h-6" /> },
  { name: 'Sleeper', icon: <Bed className="w-6 h-6" /> },
  { name: 'Express', icon: <Zap className="w-6 h-6" /> },
  { name: 'VIP', icon: <Sparkles className="w-6 h-6" /> },
  { name: 'Trending', icon: <Flame className="w-6 h-6" /> },
];

interface CategoryFiltersProps {
  onChange?: (category: string) => void;
}

export function CategoryFilters({ onChange }: CategoryFiltersProps) {
  const [active, setActive] = useState('Luxury');

  function handleClick(name: string) {
    setActive(name);
    onChange?.(name);
  }

  return (
    <div className="sticky top-20 z-40 bg-white border-b border-gray-100">
      <div className="max-w-7xl mx-auto px-6">
        <div className="flex items-end gap-2 overflow-x-auto hide-scrollbar">
          {categories.map(cat => (
            <button
              key={cat.name}
              onClick={() => handleClick(cat.name)}
              className={`flex flex-col items-center justify-center min-w-[70px] gap-1.5 py-4 px-2 border-b-2 transition-all cursor-pointer whitespace-nowrap
                ${active === cat.name
                  ? 'border-gray-900 text-gray-900'
                  : 'border-transparent text-gray-400 hover:text-gray-700 hover:border-gray-300'}`}
            >
              <div className={`transition-transform ${active === cat.name ? 'scale-110' : 'hover:scale-110'}`}>
                {cat.icon}
              </div>
              <span className="text-[12px] font-medium">{cat.name}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
