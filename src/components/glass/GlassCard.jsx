/* Base frosted-glass card — the foundation every list/content card in the
   app builds on. Thin by design: layout/spacing stays with the caller,
   this only owns the glass surface treatment (blur, border, shadow, radius). */
function GlassCard({
  as: Tag = "div",
  interactive = false,
  padding = "p-4",
  className = "",
  children,
  ...props
}) {
  return (
    <Tag
      className={`glass-surface rounded-card shadow-glass ${padding} ${
        interactive
          ? "cursor-pointer text-left transition-transform duration-300 ease-in-out hover:-translate-y-0.5 active:scale-[0.98]"
          : ""
      } ${className}`}
      {...props}
    >
      {children}
    </Tag>
  );
}

export default GlassCard;
