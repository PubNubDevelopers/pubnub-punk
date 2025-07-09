import { Progress } from '@/components/ui/progress';
import { LoadingProgress } from '@/types/app-context';

interface LoadingProgressProps {
  progress: LoadingProgress;
}

export function LoadingProgressComponent({ progress }: LoadingProgressProps) {
  const percentage = progress.total 
    ? Math.round((progress.current / progress.total) * 100)
    : 0;

  return (
    <div className="text-center py-8">
      <div className="mb-4">
        <div className="text-lg font-medium text-gray-700">
          {progress.message}
        </div>
        {progress.total && (
          <div className="text-sm text-gray-500 mt-1">
            {progress.current} of {progress.total} items
          </div>
        )}
      </div>
      
      {progress.total && (
        <div className="max-w-md mx-auto">
          <Progress value={percentage} className="w-full" />
          <div className="text-sm text-gray-500 mt-1">
            {percentage}% complete
          </div>
        </div>
      )}
    </div>
  );
}