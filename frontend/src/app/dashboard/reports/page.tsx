import { Suspense } from 'react';
import ReportsContent from './ReportsContent';

export const dynamic = 'force-dynamic';

export default async function ReportsPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const params = await searchParams;
  const id = typeof params.id === 'string' ? params.id : undefined;

  return (
    <Suspense fallback={<div className="flex items-center justify-center h-64 text-white">Loading...</div>}>
      <ReportsContent id={id} />
    </Suspense>
  );
}
