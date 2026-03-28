import { Suspense } from 'react';
import ReportsContent from './ReportsContent';

export const dynamic = 'force-dynamic';

export default function ReportsPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center h-64 text-white">Loading...</div>}>
      <ReportsContent />
    </Suspense>
  );
}
