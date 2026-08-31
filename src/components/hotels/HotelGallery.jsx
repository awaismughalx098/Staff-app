import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronLeft, ChevronRight, Hotel as HotelIcon, Play, X } from "lucide-react";

/* Cover + gallery + clips as one swipeable strip. Videos are kept as separate
   slides rather than mixed into the image array so the poster frame, the play
   affordance and the pause-on-close behaviour stay explicit. */
function HotelGallery({ images = [], videos = [], name, getUrl }) {
  const slides = [
    ...images.map((src) => ({ kind: "image", src })),
    ...videos.map((src) => ({ kind: "video", src })),
  ];

  const [index, setIndex] = useState(0);
  const [lightbox, setLightbox] = useState(false);

  if (slides.length === 0) {
    return (
      <div className="glass-surface flex h-56 w-full items-center justify-center rounded-card md:h-72">
        <HotelIcon className="h-16 w-16 text-content-faint" />
      </div>
    );
  }

  const safeIndex = Math.min(index, slides.length - 1);
  const current = slides[safeIndex];
  const go = (step) =>
    setIndex((i) => (i + step + slides.length) % slides.length);

  return (
    <>
      <div className="relative overflow-hidden rounded-card shadow-glass">
        <AnimatePresence mode="wait">
          <motion.div
            key={safeIndex}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="h-56 w-full md:h-72"
          >
            {current.kind === "image" ? (
              <button
                type="button"
                onClick={() => setLightbox(true)}
                className="h-full w-full cursor-zoom-in"
                aria-label="Open photo"
              >
                <img
              loading="lazy"
              decoding="async"
                  src={getUrl(current.src)}
                  alt={name}
                  className="h-full w-full object-cover"
                />
              </button>
            ) : (
              <video
                src={getUrl(current.src)}
                controls
                playsInline
                preload="metadata"
                className="h-full w-full bg-black object-contain"
              />
            )}
          </motion.div>
        </AnimatePresence>

        {slides.length > 1 && (
          <>
            <button
              type="button"
              onClick={() => go(-1)}
              aria-label="Previous"
              className="absolute left-3 top-1/2 flex h-9 w-9 -translate-y-1/2 cursor-pointer items-center justify-center rounded-full bg-black/45 text-white backdrop-blur-sm transition-colors hover:bg-black/65"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
            <button
              type="button"
              onClick={() => go(1)}
              aria-label="Next"
              className="absolute right-3 top-1/2 flex h-9 w-9 -translate-y-1/2 cursor-pointer items-center justify-center rounded-full bg-black/45 text-white backdrop-blur-sm transition-colors hover:bg-black/65"
            >
              <ChevronRight className="h-5 w-5" />
            </button>

            <span className="absolute right-3 top-3 rounded-full bg-black/45 px-2.5 py-1 text-[11px] font-bold text-white backdrop-blur-sm">
              {safeIndex + 1}/{slides.length}
            </span>
          </>
        )}
      </div>

      {slides.length > 1 && (
        <div className="mt-3 flex gap-2 overflow-x-auto pb-1">
          {slides.map((slide, i) => (
            <button
              key={`${slide.kind}-${slide.src}`}
              type="button"
              onClick={() => setIndex(i)}
              aria-label={`View ${slide.kind} ${i + 1}`}
              className={`relative h-14 w-20 shrink-0 overflow-hidden rounded-xl border-2 transition-colors ${
                i === safeIndex ? "border-accent" : "border-transparent"
              }`}
            >
              {slide.kind === "image" ? (
                <img
              loading="lazy"
              decoding="async"
                  src={getUrl(slide.src)}
                  alt=""
                  className="h-full w-full object-cover"
                />
              ) : (
                <span className="flex h-full w-full items-center justify-center bg-content/80">
                  <Play className="h-4 w-4 fill-white text-white" />
                </span>
              )}
            </button>
          ))}
        </div>
      )}

      <AnimatePresence>
        {lightbox && current.kind === "image" && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setLightbox(false)}
            className="fixed inset-0 z-[200] flex items-center justify-center bg-black/90 p-4"
          >
            <button
              type="button"
              onClick={() => setLightbox(false)}
              aria-label="Close photo"
              className="absolute right-4 top-4 flex h-10 w-10 cursor-pointer items-center justify-center rounded-full bg-white/15 text-white"
            >
              <X className="h-5 w-5" />
            </button>
            <img
              src={getUrl(current.src)}
              alt={name}
              onClick={(e) => e.stopPropagation()}
              className="max-h-full max-w-full rounded-card object-contain"
            />
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

export default HotelGallery;
