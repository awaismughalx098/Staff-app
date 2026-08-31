/* The moving name strip across the top of the auth screens.
 *
 * Decorative: the logo underneath already names the product, so this is hidden
 * from assistive tech rather than read out on a loop. The run of words is
 * rendered twice and the track slides exactly half its width, so the loop has
 * no seam. */
const WORD = "Let's Goo Transit";
const REPEATS = 6;

function Run() {
  return (
    <span className="flex shrink-0 items-center">
      {Array.from({ length: REPEATS }).map((_, i) => (
        <span key={i} className="flex items-center">
          <span className="px-5 text-[11.5px] font-bold uppercase tracking-[0.22em] text-white">
            {WORD}
          </span>
          <span className="h-1 w-1 shrink-0 rounded-full bg-white/55" />
        </span>
      ))}
    </span>
  );
}

function BrandMarquee({ className = "" }) {
  return (
    <div
      aria-hidden="true"
      className={`overflow-hidden bg-accent py-2 ${className}`}
    >
      <div className="marquee-track">
        <Run />
        <Run />
      </div>
    </div>
  );
}

export default BrandMarquee;
