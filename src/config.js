/* Where the backend lives.
 *
 * A production build defaults to the deployed API, a dev build to the local
 * one. This is deliberate: relying on VITE_API_URL being set at build time
 * meant an unconfigured host shipped a bundle pointing at localhost — the
 * visitor's own machine — which fails as "Cannot reach the server" and reads
 * like a backend outage.
 *
 * The API origin is public (it appears in every network request), so nothing
 * is protected by keeping it out of the source. VITE_API_URL still overrides
 * both, for staging or a self-hosted backend; Vite inlines it at build time,
 * so changing it on the host requires a rebuild.
 */
const DEFAULT_ORIGIN = import.meta.env.PROD
  ? "https://lets-go-transit-server.onrender.com"
  : "http://localhost:5000";

const RAW = import.meta.env.VITE_API_URL || DEFAULT_ORIGIN;

/* Tolerate a trailing slash or an accidental /api suffix in the env var, so
   a plausible-looking value never silently produces /api/api URLs. */
export const API_ORIGIN = RAW.trim()
  .replace(/\/+$/, "")
  .replace(/\/api$/, "");

export const API_BASE_URL = `${API_ORIGIN}/api`;

/* Only reachable now if VITE_API_URL was explicitly set to a localhost value
   on a deployed host — worth saying out loud, since every request would fail
   against the visitor's own machine. */
if (typeof window !== "undefined") {
  const onLocalhost = /^(localhost|127\.0\.0\.1)$/.test(window.location.hostname);

  if (!onLocalhost && API_ORIGIN.includes("localhost")) {
    console.error(
      `[config] This build calls ${API_ORIGIN}, which is the visitor's own machine. ` +
        "Clear or correct VITE_API_URL on the host, then redeploy."
    );
  }
}

/* Cloudinary resizes, re-encodes and compresses on delivery, and the URL is
   the whole API: a transformation goes in the path right after /upload/.
   Left alone it hands back the original — a 3 MB phone photo, as uploaded,
   to render a 96-pixel thumbnail.

   f_auto picks the best format the requesting browser accepts (AVIF, WebP,
   or the original for something ancient) and q_auto picks a quality by
   looking at the image, both of which are decided per request rather than
   guessed here. c_limit only ever shrinks: an image smaller than the width
   asked for is left at its own size rather than being blown up.

   A URL that has already been transformed is returned untouched, so this is
   safe to apply twice. */
const CLOUDINARY_UPLOAD = "/image/upload/";

export const cdnImage = (url, width) => {
  if (typeof url !== "string" || !url.includes("res.cloudinary.com")) return url;

  const at = url.indexOf(CLOUDINARY_UPLOAD);
  if (at === -1) return url;

  const head = url.slice(0, at + CLOUDINARY_UPLOAD.length);
  const tail = url.slice(at + CLOUDINARY_UPLOAD.length);

  if (/^(f_auto|q_auto|w_\d|c_limit|dpr_)/.test(tail)) return url;

  const parts = ["f_auto", "q_auto"];
  if (width) parts.push(`w_${Math.round(width)}`, "c_limit");

  return `${head}${parts.join(",")}/${tail}`;
};

/**
 * The URL to actually render for a stored image.
 *
 * Handles every shape the app holds one in: an absolute Cloudinary URL, a
 * server-relative /uploads path from before Cloudinary was configured, a
 * data: URI, and the blob: URL of a file the user has only just picked in a
 * form and not uploaded yet.
 *
 * Falls back to a cap rather than to the original. A photo straight off a
 * phone is three or four thousand pixels wide, and nothing in this app is
 * ever drawn wider than a full-screen gallery on a big display — so without a
 * ceiling the common case is downloading eight times the pixels that get
 * shown. Pass a real width for a thumbnail and it shrinks much further.
 *
 * @param {string} path
 * @param {number} [width] the widest it will ever be drawn, in CSS pixels —
 *   pass double for a retina screen.
 */
const MAX_DELIVERED_WIDTH = 1600;

export const getUploadUrl = (path, width = MAX_DELIVERED_WIDTH) => {
  if (!path || typeof path !== "string") return null;

  /* Not ours to rewrite: a local preview, or an image inlined in the page. */
  if (path.startsWith("data:") || path.startsWith("blob:")) return path;

  if (path.startsWith("http")) return cdnImage(path, width);

  return `${API_ORIGIN}${path}`;
};
