import { Suspense } from 'react';
import AuthCallbackContent from './AuthCallbackContent';

export const dynamic = 'force-dynamic';

export default async function AuthCallbackPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const params = await searchParams;
  const token = typeof params.token === 'string' ? params.token : undefined;
  const error = typeof params.error === 'string' ? params.error : undefined;

  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center gradient-bg">
          <div className="w-10 h-10 rounded-full border-4 border-[#16161e] border-t-[#6c63ff] animate-spin"></div>
        </div>
      }
    >
      <AuthCallbackContent token={token} error={error} />
    </Suspense>
  );
}
