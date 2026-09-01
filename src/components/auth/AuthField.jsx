import { useState } from "react";
import { Eye, EyeOff } from "lucide-react";

/* The one field used by both auth screens, so sign-in and sign-up are visibly
 * the same product. Flat and opaque on the app's warm background — the old
 * translucent glass field belonged to the dark photo backdrop that is gone.
 *
 * Renders an <input> or a <select> (for city) through the same frame, and
 * carries its own show/hide for passwords and its own error line. */
function AuthField({
  icon: Icon,
  as = "input",
  type = "text",
  placeholder,
  value,
  onChange,
  disabled,
  autoComplete,
  inputMode,
  maxLength,
  error,
  options = [],
  hint,
}) {
  const [show, setShow] = useState(false);
  const isPassword = type === "password";
  const resolved = isPassword && show ? "text" : type;
  const isSelect = as === "select";

  return (
    <div className="w-full">
      <div
        className={`field-halo flex h-[46px] w-full items-center gap-3 rounded-input border bg-surface px-3.5 transition-all duration-200 ${
          error ? "border-danger" : "border-line"
        }`}
      >
        {Icon && (
          <Icon
            className={`h-[18px] w-[18px] shrink-0 ${
              error ? "text-danger" : "text-content-muted"
            }`}
            aria-hidden="true"
          />
        )}

        {isSelect ? (
          <select
            value={value}
            onChange={onChange}
            disabled={disabled}
            aria-label={placeholder}
            className={`flex-1 cursor-pointer bg-transparent text-[15px] outline-none disabled:opacity-60 ${
              value ? "text-content" : "text-content-muted"
            }`}
          >
            <option value="" disabled hidden>
              {placeholder}
            </option>
            {options.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        ) : (
          <input
            type={resolved}
            value={value}
            onChange={onChange}
            placeholder={placeholder}
            disabled={disabled}
            autoComplete={autoComplete}
            inputMode={inputMode}
            maxLength={maxLength}
            aria-label={placeholder}
            aria-invalid={Boolean(error)}
            className="min-w-0 flex-1 bg-transparent text-[15px] text-content outline-none placeholder:text-content-muted disabled:opacity-60"
          />
        )}

        {isPassword && (
          <button
            type="button"
            onClick={() => setShow((p) => !p)}
            aria-label={show ? "Hide password" : "Show password"}
            className="shrink-0 text-content-muted transition-colors hover:text-content"
          >
            {show ? (
              <EyeOff className="h-[18px] w-[18px]" />
            ) : (
              <Eye className="h-[18px] w-[18px]" />
            )}
          </button>
        )}
      </div>

      {error ? (
        <p className="mt-1.5 px-1 text-[12px] font-medium text-danger">{error}</p>
      ) : hint ? (
        <p className="mt-1.5 px-1 text-[11.5px] text-content-muted">{hint}</p>
      ) : null}
    </div>
  );
}

export default AuthField;
