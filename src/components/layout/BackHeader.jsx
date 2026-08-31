import { useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";

/* Sticky glass sub-page header: back button + title */
function BackHeader({ title, subtitle, fallback = "/home", right }) {
  const navigate = useNavigate();

  const goBack = () => {
    if (window.history.length > 1) navigate(-1);
    else navigate(fallback);
  };

  return (
    <header className="sticky top-0 z-40 bg-bg/70 px-4 pt-safe backdrop-blur-2xl">
      <div className="mx-auto flex max-w-5xl items-center gap-3 py-3.5">
        <button
          type="button"
          onClick={goBack}
          aria-label="Go back"
          className="glass-surface flex h-10 w-10 shrink-0 cursor-pointer items-center justify-center rounded-full transition-transform duration-300 ease-in-out hover:scale-105 active:scale-95"
        >
          <ArrowLeft className="h-[18px] w-[18px] text-content" strokeWidth={2} />
        </button>
        <div className="min-w-0 flex-1">
          <h1 className="truncate font-display text-[17px] font-bold leading-tight text-content">
            {title}
          </h1>
          {subtitle && (
            <p className="truncate text-[12px] text-content-muted">{subtitle}</p>
          )}
        </div>
        {right && <div className="shrink-0">{right}</div>}
      </div>
    </header>
  );
}

export default BackHeader;
