/**
 * A single-colour icon, drawn as a CSS mask over a background colour.
 *
 * These assets are monochrome glyphs rather than pictures. Rendering them as
 * masks is what lets them take their colour from the surrounding state — an
 * active tab, a hover — which an `<img>` cannot do. It also keeps them out of
 * the image pipeline, whose intrinsic-size checks do not apply to a shape being
 * used as a mask.
 */
export function Glyph({
  src,
  className = "",
  size,
}: {
  src: string;
  /** Carries the background colour, which is what the glyph renders as. */
  className?: string;
  /** Width and height in pixels, when the glyph is not sized by `className`. */
  size?: { readonly width: number; readonly height: number };
}) {
  return (
    <span
      aria-hidden
      className={`block flex-none ${className}`}
      style={{
        width: size?.width,
        height: size?.height,
        WebkitMask: `url(${src}) center/contain no-repeat`,
        mask: `url(${src}) center/contain no-repeat`,
      }}
    />
  );
}

/** The back chevron, at the size the design uses everywhere it appears. */
export function BackGlyph({ className = "bg-primary" }: { className?: string }) {
  return (
    <Glyph
      src="/assets/ic-back.svg"
      className={className}
      size={{ width: 7.293, height: 15 }}
    />
  );
}
