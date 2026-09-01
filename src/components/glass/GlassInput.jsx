import { useId, useState } from "react";

/* Glass input with a floating label — label sits as a placeholder until the
   field has focus or a value, then floats above the border like iOS forms.
   Falls back to a plain placeholder when no label is given (e.g. search bars
   that already show an icon).

   Three things the label has to stay clear of, or it renders on top of them:
   - the browser placeholder, which occupies the same spot while unfloated,
     so the placeholder is only handed to the DOM once the label has floated
     out of the way;
   - a leading `icon`, which pushes both the label and the text across;
   - the input's own border, which the floated label straddles — hence the
     small opaque chip behind it. */
function GlassInput({
  label,
  as = "input",
  icon: Icon,
  className = "",
  value,
  onChange,
  placeholder,
  ...props
}) {
  const id = useId();
  const [focused, setFocused] = useState(false);
  const Tag = as;
  const hasValue = value !== undefined && value !== null && String(value).length > 0;

  /* Date/time fields paint their own "dd/mm/yyyy" hint even while empty, so
     their label can never rest in the middle — it would land on top of it. */
  const ALWAYS_FLOATED = ["date", "time", "datetime-local", "month", "week"];
  const forceFloat = ALWAYS_FLOATED.includes(props.type);

  const floated = focused || hasValue || forceFloat;

  /* A textarea's label must sit on the first line, not halfway down the box. */
  const isTextarea = as === "textarea";

  return (
    <div className="relative">
      {Icon && (
        <Icon
          className={`pointer-events-none absolute left-4 z-10 h-[18px] w-[18px] text-content-muted ${
            isTextarea ? "top-[17px]" : "top-1/2 -translate-y-1/2"
          }`}
          aria-hidden="true"
        />
      )}

      {label && (
        <label
          htmlFor={id}
          className={`pointer-events-none absolute z-20 origin-left rounded px-1 font-medium transition-all duration-200 ease-in-out ${
            Icon && !floated ? "left-11" : "left-3"
          } ${
            floated
              ? "top-0 -translate-y-1/2 bg-[color:var(--bg)] text-[11px] text-accent"
              : isTextarea
              ? "top-[17px] bg-transparent text-[14px] text-content-muted"
              : "top-1/2 -translate-y-1/2 bg-transparent text-[14px] text-content-muted"
          }`}
        >
          {label}
        </label>
      )}

      <Tag
        id={id}
        value={value}
        onChange={onChange}
        /* Holding the placeholder back until the label floats keeps the two
           from being painted over each other. */
        placeholder={label && !floated ? undefined : placeholder}
        onFocus={(e) => {
          setFocused(true);
          props.onFocus?.(e);
        }}
        onBlur={(e) => {
          setFocused(false);
          props.onBlur?.(e);
        }}
        /* Horizontal padding stays on px-4 rather than a pl-4/pr-4 pair: a
           caller's own one-sided override (the password eye's pr-12) beats
           px-4 in the cascade, but would tie with pr-4 and lose. */
        className={`glass-surface w-full rounded-input text-[14px] text-content outline-none transition-colors duration-300 ease-in-out placeholder:text-content-muted focus:border-accent-line px-4 ${
          isTextarea ? "min-h-[92px] py-3" : "h-[46px]"
        } ${Icon ? "pl-11" : ""} ${className}`}
        {...props}
      />
    </div>
  );
}

export default GlassInput;
