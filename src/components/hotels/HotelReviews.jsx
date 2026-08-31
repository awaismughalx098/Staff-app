import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { MessageSquare, Star, Trash2, User } from "lucide-react";
import { toast } from "sonner";

import { GlassButton } from "../glass";
import {
  saveHotelReview,
  deleteHotelReview,
} from "../../services/hotelService";
import { getPassengerInfo } from "../../utils/passengerAuth";
import { getUploadUrl } from "../../config";

const getImageUrl = (img, width) => getUploadUrl(img, width);

const formatWhen = (date) =>
  new Date(date).toLocaleDateString([], {
    day: "numeric",
    month: "short",
    year: "numeric",
  });

function Stars({ value, size = "h-3.5 w-3.5" }) {
  return (
    <span className="flex items-center gap-0.5" aria-label={`${value} out of 5`}>
      {[1, 2, 3, 4, 5].map((n) => (
        <Star
          key={n}
          className={`${size} ${
            n <= value ? "fill-accent text-accent" : "text-content-faint"
          }`}
        />
      ))}
    </span>
  );
}

function StarPicker({ value, onChange }) {
  const [hover, setHover] = useState(0);
  const shown = hover || value;

  return (
    <div className="flex items-center gap-1.5">
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          type="button"
          onClick={() => onChange(n)}
          onMouseEnter={() => setHover(n)}
          onMouseLeave={() => setHover(0)}
          aria-label={`Rate ${n} star${n === 1 ? "" : "s"}`}
          className="cursor-pointer transition-transform active:scale-90"
        >
          <Star
            className={`h-7 w-7 ${
              n <= shown ? "fill-accent text-accent" : "text-content-faint"
            }`}
          />
        </button>
      ))}
    </div>
  );
}

function HotelReviews({ hotelId, reviews, onChanged }) {
  const me = getPassengerInfo();
  const myId = me?._id;

  const mine = reviews.find((r) => (r.passenger?._id || r.passenger) === myId);

  const [rating, setRating] = useState(mine?.rating || 0);
  const [comment, setComment] = useState(mine?.comment || "");
  const [saving, setSaving] = useState(false);
  const [open, setOpen] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    if (rating < 1) {
      toast.error("Pick a star rating first");
      return;
    }

    setSaving(true);
    try {
      const res = await saveHotelReview(hotelId, { rating, comment });
      toast.success(res.message || "Thanks for your review");
      setOpen(false);
      onChanged?.(res.hotel);
    } catch (err) {
      toast.error(err?.response?.data?.message || "Couldn't save your review");
    } finally {
      setSaving(false);
    }
  };

  const remove = async (reviewId) => {
    try {
      await deleteHotelReview(hotelId, reviewId);
      toast.success("Review removed");
      setRating(0);
      setComment("");
      onChanged?.();
    } catch (err) {
      toast.error(err?.response?.data?.message || "Couldn't remove review");
    }
  };

  return (
    <section className="glass-surface mt-5 rounded-card p-5 shadow-glass">
      <div className="flex items-center justify-between gap-3">
        <h3 className="font-display text-[15px] font-bold text-content">
          Reviews
          {reviews.length > 0 && (
            <span className="ml-1.5 text-[12px] font-medium text-content-muted">
              ({reviews.length})
            </span>
          )}
        </h3>
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="cursor-pointer text-[12.5px] font-bold text-accent transition-opacity hover:opacity-80"
        >
          {mine ? "Edit yours" : "Write a review"}
        </button>
      </div>

      <AnimatePresence initial={false}>
        {open && (
          <motion.form
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
            onSubmit={submit}
            className="overflow-hidden"
          >
            <div className="mt-4 space-y-3">
              <StarPicker value={rating} onChange={setRating} />
              <textarea
                rows={3}
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                placeholder="How was your stay?"
                maxLength={1000}
                className="glass-surface w-full rounded-input px-4 py-3 text-[13.5px] text-content outline-none placeholder:text-content-muted focus:border-accent-line"
              />
              <GlassButton type="submit" disabled={saving} className="h-11 w-full">
                {saving ? "Saving..." : mine ? "Update Review" : "Post Review"}
              </GlassButton>
            </div>
          </motion.form>
        )}
      </AnimatePresence>

      <div className="mt-4 space-y-3">
        {reviews.length === 0 && !open && (
          <div className="flex flex-col items-center py-6 text-center">
            <MessageSquare className="h-8 w-8 text-content-faint" />
            <p className="mt-2 text-[13px] text-content-muted">
              No reviews yet — be the first to share your stay.
            </p>
          </div>
        )}

        {reviews.map((review) => {
          const isMine = (review.passenger?._id || review.passenger) === myId;
          return (
            <div
              key={review._id}
              className="rounded-card border border-line bg-surface p-3.5"
            >
              <div className="flex items-start gap-3">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-full bg-elevated">
                  {review.passenger?.image ? (
                    <img
              loading="lazy"
              decoding="async"
                      src={getImageUrl(review.passenger.image)}
                      alt=""
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <User className="h-4 w-4 text-content-muted" />
                  )}
                </span>

                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <p className="truncate text-[13px] font-bold text-content">
                      {review.passenger?.name || "Guest"}
                      {isMine && (
                        <span className="ml-1.5 text-[11px] font-medium text-accent">
                          you
                        </span>
                      )}
                    </p>
                    {isMine && (
                      <button
                        type="button"
                        onClick={() => remove(review._id)}
                        aria-label="Delete review"
                        className="shrink-0 cursor-pointer text-content-muted transition-colors hover:text-danger"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </div>

                  <div className="mt-1 flex items-center gap-2">
                    <Stars value={review.rating} />
                    <span className="text-[11px] text-content-muted">
                      {formatWhen(review.createdAt)}
                    </span>
                  </div>

                  {review.comment && (
                    <p className="mt-1.5 whitespace-pre-line text-[13px] leading-6 text-content-muted">
                      {review.comment}
                    </p>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}

export { Stars };
export default HotelReviews;
