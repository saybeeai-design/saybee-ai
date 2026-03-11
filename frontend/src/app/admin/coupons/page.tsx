'use client';
import { Tag } from 'lucide-react';

export default function CouponsPage() {
  return (
    <div>
      <h1 className="text-3xl font-bold text-white mb-8">Coupons Management</h1>
      <div className="glass-card p-12 text-center border-white/5 rounded-2xl flex flex-col items-center justify-center min-h-[400px]">
        <Tag className="w-16 h-16 text-rose-400 mb-6 opacity-50" />
        <h2 className="text-xl font-medium text-white mb-2">Coupons Interface Coming Soon</h2>
        <p className="text-gray-400 max-w-md">
          Manage promotional codes, specify discount rates, and track coupon usage from this centralized dashboard.
        </p>
      </div>
    </div>
  );
}
