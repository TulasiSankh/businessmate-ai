import { AlertCircle, RefreshCw } from 'lucide-react';

interface ErrorStateProps {
  message?: string;
  onRetry?: () => void;
}

export default function ErrorState({ message = 'Something went wrong', onRetry }: ErrorStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center px-4">
      <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-red-50 mb-4">
        <AlertCircle className="h-8 w-8 text-red-400" />
      </div>
      <p className="text-sm font-medium text-slate-600 mb-1">{message}</p>
      <p className="text-xs text-slate-400 mb-4">Please check your connection and try again.</p>
      {onRetry && (
        <button
          onClick={onRetry}
          className="flex items-center gap-2 rounded-lg bg-teal-50 text-teal-700 px-4 py-2.5 text-sm font-medium hover:bg-teal-100 active:bg-teal-200 transition-colors min-h-[44px]"
        >
          <RefreshCw className="h-4 w-4" />
          Try Again
        </button>
      )}
    </div>
  );
}
