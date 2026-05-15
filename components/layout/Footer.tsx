import Link from 'next/link';
import { Globe } from 'lucide-react';

export function Footer() {
  return (
    <footer className="bg-[#F7F7F7] border-t border-gray-200 mt-auto pt-12 pb-6 text-gray-600 text-sm">
      <div className="max-w-7xl mx-auto px-6 grid grid-cols-1 md:grid-cols-3 gap-8 mb-8 border-b border-gray-200 pb-8">
        <div>
          <h4 className="font-bold text-gray-900 mb-4">Support</h4>
          <ul className="space-y-3">
            <li><Link href="#" className="hover:underline">Help Centre</Link></li>
            <li><Link href="#" className="hover:underline">Cancellation options</Link></li>
            <li><Link href="#" className="hover:underline">Safety information</Link></li>
          </ul>
        </div>
        <div>
          <h4 className="font-bold text-gray-900 mb-4">Company</h4>
          <ul className="space-y-3">
            <li><Link href="#" className="hover:underline">About us</Link></li>
            <li><Link href="#" className="hover:underline">Careers</Link></li>
            <li><Link href="#" className="hover:underline">Investors</Link></li>
          </ul>
        </div>
        <div>
          <h4 className="font-bold text-gray-900 mb-4">Operators</h4>
          <ul className="space-y-3">
            <li><Link href="#" className="hover:underline">Host your bus</Link></li>
            <li><Link href="#" className="hover:underline">Operator resources</Link></li>
            <li><Link href="#" className="hover:underline">Community forum</Link></li>
          </ul>
        </div>
      </div>
      <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-4 text-xs">
          <span>© 2026 BusMarketplace, Inc.</span>
          <span>·</span>
          <Link href="#" className="hover:underline">Privacy</Link>
          <span>·</span>
          <Link href="#" className="hover:underline">Terms</Link>
          <span>·</span>
          <Link href="#" className="hover:underline">Sitemap</Link>
        </div>
        <div className="flex items-center gap-4 font-medium text-gray-900 text-sm">
          <div className="flex items-center gap-2 cursor-pointer hover:underline">
            <Globe className="w-4 h-4" /> English (US)
          </div>
          <div className="cursor-pointer hover:underline">KES</div>
        </div>
      </div>
    </footer>
  );
}
