import { Suspense } from 'react';
import AuthCallbackContent from './AuthCallbackContent';

export const dynamic = 'force-dynamic';

export default function AuthCallbackPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center gradient-bg">
          <div className="w-10 h-10 rounded-full border-4 border-[#16161e] border-t-[#6c63ff] animate-spin"></div>
        </div>
      }
    >
      <AuthCallbackContent />
    </Suspense>
  );
}
