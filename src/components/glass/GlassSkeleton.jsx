/* Pulsing glass placeholder block for loading states — replaces the
   hand-typed `animate-pulse rounded-card border-line bg-surface` divs
   repeated on every list page. */
function GlassSkeleton({ className = "h-20", count = 1 }) {
  return (
    <>
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className={`glass-surface animate-pulse rounded-card ${className}`} />
      ))}
    </>
  );
}

export default GlassSkeleton;
