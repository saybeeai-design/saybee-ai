'use client';
import { DollarSign } from 'lucide-react';

export default function RevenuePage() {
  return (
    <div>
      <h1 className="text-3xl font-bold text-white mb-8">Revenue & Subscriptions</h1>
      <div className="glass-card p-12 text-center border-white/5 rounded-2xl flex flex-col items-center justify-center min-h-[400px]">
        <DollarSign className="w-16 h-16 text-emerald-400 mb-6 opacity-50" />
        <h2 className="text-xl font-medium text-white mb-2">Revenue Dashboard Coming Soon</h2>
        <p className="text-gray-400 max-w-md">
          This module will provide a full overview of active subscriptions, recent transactions, and MRR (Monthly Recurring Revenue).
        </p>
      </div>
    </div>
  );
}
