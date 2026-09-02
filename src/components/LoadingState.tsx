import { Loader2 } from 'lucide-react';

export default function LoadingState({ label = 'Loading...' }: { label?: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-16">
      <Loader2 className="h-8 w-8 text-teal-500 animate-spin mb-3" />
      <p className="text-sm text-slate-400">{label}</p>
    </div>
  );
}
