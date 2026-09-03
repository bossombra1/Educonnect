import { useEffect, useState } from 'react';
import { AlertCircle, RefreshCw, X } from 'lucide-react';

export const API_ERROR_EVENT = 'educonnect:api-error';

type ApiErrorDetail = { message: string };

export default function ApiErrorBanner() {
  const [error, setError] = useState<ApiErrorDetail | null>(null);

  useEffect(() => {
    const handleError = (event: Event) => {
      const detail = (event as CustomEvent<ApiErrorDetail>).detail;
      if (detail?.message) setError(detail);
    };

    window.addEventListener(API_ERROR_EVENT, handleError);
    return () => window.removeEventListener(API_ERROR_EVENT, handleError);
  }, []);

  if (!error) return null;

  return (
    <div className="border-b border-red-200 bg-red-50 px-4 py-3" role="alert">
      <div className="mx-auto flex max-w-7xl items-center gap-3 text-sm text-red-800">
        <AlertCircle className="h-5 w-5 shrink-0" aria-hidden="true" />
        <p className="min-w-0 flex-1">{error.message}</p>
        <button
          type="button"
          onClick={() => window.location.reload()}
          className="inline-flex shrink-0 items-center gap-2 rounded-md border border-red-300 bg-white px-3 py-1.5 font-medium text-red-800 hover:bg-red-100 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2"
        >
          <RefreshCw className="h-4 w-4" aria-hidden="true" />
          Réessayer
        </button>
        <button
          type="button"
          onClick={() => setError(null)}
          aria-label="Fermer le message d'erreur"
          className="rounded-md p-1 text-red-600 hover:bg-red-100 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2"
        >
          <X className="h-4 w-4" aria-hidden="true" />
        </button>
      </div>
    </div>
  );
}
