/** Shared sizing/spacing for every admin form field & button — keeps all 7 CRUD pages consistent. */

export const inputClass =
  "glass-surface h-[46px] w-full rounded-input px-3.5 text-[13.5px] text-content outline-none transition-colors duration-300 ease-in-out placeholder:text-content-muted focus:border-accent-line";

export const selectClass = inputClass;

export const textareaClass =
  "glass-surface w-full resize-none rounded-input px-3.5 py-3 text-[13.5px] text-content outline-none transition-colors duration-300 ease-in-out placeholder:text-content-muted focus:border-accent-line";

export const labelClass = "mb-1.5 block text-[12.5px] font-semibold text-content-muted";

export const primaryButtonClass =
  "flex h-11 w-full cursor-pointer items-center justify-center gap-2 rounded-input bg-accent text-[13.5px] font-bold text-white shadow-glass transition-transform duration-300 ease-in-out active:scale-[0.98] disabled:opacity-60";

export const addButtonClass =
  "flex h-9 shrink-0 cursor-pointer items-center gap-1.5 rounded-full bg-accent px-3.5 text-[12.5px] font-bold text-white shadow-glass transition-transform duration-300 ease-in-out active:scale-95";

export const searchWrapClass =
  "glass-surface field-halo flex h-11 items-center gap-3 rounded-input px-4 transition-all duration-300 ease-in-out";

export const searchInputClass =
  "h-full min-w-0 flex-1 bg-transparent text-[13.5px] text-content outline-none placeholder:text-content-muted";
