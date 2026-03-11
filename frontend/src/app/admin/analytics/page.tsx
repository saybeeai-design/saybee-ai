'use client';
import { BarChart3 } from 'lucide-react';

export default function AnalyticsPage() {
  return (
    <div>
      <h1 className="text-3xl font-bold text-white mb-8">Interviews Analytics</h1>
      <div className="glass-card p-12 text-center border-white/5 rounded-2xl flex flex-col items-center justify-center min-h-[400px]">
        <BarChart3 className="w-16 h-16 text-indigo-400 mb-6 opacity-50" />
        <h2 className="text-xl font-medium text-white mb-2">Detailed Analytics Coming Soon</h2>
        <p className="text-gray-400 max-w-md">
          This section will display deep insights into interview performance, AI usage, and transcript generation trends.
        </p>
      </div>
    </div>
  );
}
