import { StrictMode } from 'react'
import "./index.css";

import { createRoot } from 'react-dom/client'
import App from './App.jsx'
import ErrorBoundary from "./components/system/ErrorBoundary.jsx";

/* Any <img> that fails to load — a deleted upload, a broken Cloudinary link, a
   dropped connection — is swapped once for a neutral placeholder instead of
   showing the browser's jagged broken-image icon. Image errors don't bubble,
   so this listens in the capture phase to catch them app-wide. */
const IMG_FALLBACK =
  "data:image/svg+xml;charset=utf-8," +
  encodeURIComponent(
    '<svg xmlns="http://www.w3.org/2000/svg" width="96" height="96" viewBox="0 0 24 24" fill="none" stroke="#9CA3AF" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.6"/><path d="m21 15-4.35-4.35a2 2 0 0 0-2.83 0L4 20"/></svg>'
  );

document.addEventListener(
  "error",
  (event) => {
    const el = event.target;
    if (
      el &&
      el.tagName === "IMG" &&
      el.dataset.imgFallback !== "1" &&
      el.src !== IMG_FALLBACK
    ) {
      el.dataset.imgFallback = "1";
      el.src = IMG_FALLBACK;
      el.style.objectFit = "contain";
      el.style.background = "#EEF3FA";
    }
  },
  true
);

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </StrictMode>,
)
