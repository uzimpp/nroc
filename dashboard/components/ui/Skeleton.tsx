interface SkeletonProps {
  className?: string;
  /** Render N rows of skeleton text */
  rows?: number;
  rowClassName?: string;
}

export default function Skeleton({ className = "", rows, rowClassName = "h-4" }: SkeletonProps) {
  if (rows) {
    return (
      <div className={`flex flex-col gap-2 ${className}`}>
        {Array.from({ length: rows }).map((_, i) => (
          <div
            key={i}
            className={`skeleton ${rowClassName} ${i === rows - 1 ? "w-3/4" : "w-full"}`}
          />
        ))}
      </div>
    );
  }
  return <div className={`skeleton ${className}`} />;
}

/** Full card skeleton that matches a Card's visual footprint */
export function CardSkeleton({ className = "" }: { className?: string }) {
  return (
    <div className={`card p-6 ${className}`}>
      <Skeleton rows={3} />
    </div>
  );
}
