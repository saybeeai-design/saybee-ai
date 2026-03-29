import { Suspense } from 'react';
import { Loader2 } from 'lucide-react';
import SuccessContent from './SuccessContent';

export const dynamic = 'force-dynamic';

export default async function BillingSuccessPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const params = await searchParams;
  const sessionId = typeof params.session_id === 'string' ? params.session_id : undefined;

  return (
    <Suspense
      fallback={
        <div className="flex flex-col items-center justify-center min-h-[60vh]">
          <Loader2 className="w-12 h-12 text-blue-500 animate-spin" />
        </div>
      }
    >
      <SuccessContent sessionId={sessionId} />
    </Suspense>
  );
}
