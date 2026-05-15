'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { operatorSignup } from '@/lib/api';

export default function OperatorSignupPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  const [formData, setFormData] = useState({
    companyName: '',
    contactName: '',
    email: '',
    password: '',
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      await operatorSignup(formData);
      router.push('/operators/dashboard');
    } catch (err: any) {
      setError(err.message || 'Something went wrong. Please try again.');
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-white flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8 pt-32">
      <div className="sm:mx-auto sm:w-full sm:max-w-[500px]">
        
        {/* Modal Container */}
        <div className="bg-white border border-gray-200 shadow-xl rounded-2xl overflow-hidden">
          {/* Header */}
          <div className="border-b border-gray-200 px-6 py-4 flex items-center justify-center relative">
            <h2 className="text-base font-bold text-gray-900">Partner with BusBnB</h2>
          </div>
          
          <div className="px-6 py-8 sm:px-8">
            <h3 className="text-2xl font-medium text-gray-900 mb-6">Welcome to BusBnB</h3>
            
            <form className="space-y-4" onSubmit={handleSubmit}>
              {error && (
                <div className="bg-rose-50 border border-rose-200 text-rose-600 text-sm p-3 rounded-lg mb-4">
                  {error}
                </div>
              )}
              
              <div className="rounded-lg border border-gray-400 overflow-hidden">
                <div className="px-4 py-2 border-b border-gray-400 focus-within:bg-gray-50 transition">
                  <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide">Company Name</label>
                  <input
                    name="companyName"
                    type="text"
                    required
                    value={formData.companyName}
                    onChange={handleChange}
                    className="block w-full border-0 p-0 text-gray-900 placeholder-gray-400 focus:ring-0 sm:text-base outline-none bg-transparent"
                    placeholder="e.g., Easy Coach"
                  />
                </div>

                <div className="px-4 py-2 border-b border-gray-400 focus-within:bg-gray-50 transition">
                  <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide">Contact Person</label>
                  <input
                    name="contactName"
                    type="text"
                    required
                    value={formData.contactName}
                    onChange={handleChange}
                    className="block w-full border-0 p-0 text-gray-900 placeholder-gray-400 focus:ring-0 sm:text-base outline-none bg-transparent"
                    placeholder="Full Name"
                  />
                </div>

                <div className="px-4 py-2 border-b border-gray-400 focus-within:bg-gray-50 transition">
                  <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide">Email</label>
                  <input
                    name="email"
                    type="email"
                    required
                    value={formData.email}
                    onChange={handleChange}
                    className="block w-full border-0 p-0 text-gray-900 placeholder-gray-400 focus:ring-0 sm:text-base outline-none bg-transparent"
                    placeholder="Email Address"
                  />
                </div>

                <div className="px-4 py-2 focus-within:bg-gray-50 transition">
                  <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide">Password</label>
                  <input
                    name="password"
                    type="password"
                    required
                    minLength={8}
                    value={formData.password}
                    onChange={handleChange}
                    className="block w-full border-0 p-0 text-gray-900 placeholder-gray-400 focus:ring-0 sm:text-base outline-none bg-transparent"
                    placeholder="Minimum 8 characters"
                  />
                </div>
              </div>

              <p className="text-xs text-gray-500 mt-4 mb-6">
                By selecting <strong>Agree and continue</strong>, I agree to BusBnB’s Terms of Service, Payments Terms of Service, and Nondiscrimination Policy and acknowledge the Privacy Policy.
              </p>

              <button
                type="submit"
                disabled={loading}
                className="w-full flex justify-center py-3.5 px-4 rounded-lg shadow-sm text-base font-bold text-white bg-rose-600 hover:bg-rose-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-rose-500 disabled:opacity-50 transition"
              >
                {loading ? 'Creating account...' : 'Agree and continue'}
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
