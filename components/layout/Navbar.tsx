'use client';

import Link from 'next/link';
import { UserCircle, Menu, Globe } from 'lucide-react';

export function Navbar() {
  return (
    <header className="fixed top-0 w-full bg-white z-50 border-b border-gray-200">
      <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2 group">
          <div className="w-8 h-8 bg-rose-500 rounded-full flex items-center justify-center transition-transform group-hover:scale-105">
            <span className="text-white font-bold text-sm">B</span>
          </div>
          <span className="text-rose-500 font-bold text-xl tracking-tight hidden md:block">busbnb</span>
        </Link>

        <div className="hidden md:flex items-center border border-gray-300 rounded-full py-2 px-4 shadow-sm hover:shadow-md transition cursor-pointer">
          <div className="px-3 border-r border-gray-300 font-medium text-sm text-gray-800">Anywhere</div>
          <div className="px-3 border-r border-gray-300 font-medium text-sm text-gray-800">Any week</div>
          <div className="px-3 text-gray-500 font-light text-sm">Add guests</div>
          <div className="ml-2 bg-rose-500 rounded-full p-1.5">
            <svg viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg" style={{ display: 'block', fill: 'none', height: '12px', width: '12px', stroke: 'white', strokeWidth: 5.33, overflow: 'visible' }}>
              <g fill="none"><path d="m13 24c6.08 0 11-4.92 11-11 0-6.08-4.92-11-11-11-6.08 0-11 4.92-11 11 0 6.08 4.92 11 11 11zm8-3 9 9" /></g>
            </svg>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <Link href="/operators/signup" className="hidden md:block font-medium text-sm text-gray-800 hover:bg-gray-100 px-4 py-2 rounded-full cursor-pointer transition">
            Become an operator
          </Link>
          <div className="hidden md:flex items-center justify-center p-2 hover:bg-gray-100 rounded-full cursor-pointer transition text-gray-800">
            <Globe className="w-4 h-4" />
          </div>
          <div className="flex items-center gap-2 border border-gray-300 rounded-full p-1.5 pl-3 hover:shadow-md transition cursor-pointer">
            <Menu className="w-4 h-4 text-gray-600" />
            <UserCircle className="w-8 h-8 text-gray-400" />
          </div>
        </div>
      </div>
    </header>
  );
}
