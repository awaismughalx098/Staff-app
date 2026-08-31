import { useCallback, useEffect, useState } from "react";

import {
  getPushKey,
  subscribeToPush,
  unsubscribeFromPush,
} from "../services/notificationService";

/* The VAPID key arrives base64url-encoded; PushManager wants raw bytes. */
const urlBase64ToUint8Array = (base64String) => {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = window.atob(base64);
  return Uint8Array.from([...raw].map((c) => c.charCodeAt(0)));
};

const supported = () =>
  typeof window !== "undefined" &&
  "serviceWorker" in navigator &&
  "PushManager" in window &&
  "Notification" in window;

/**
 * Turning phone notifications on for this browser.
 *
 * `status` is one of:
 *   unsupported — the browser cannot do web push at all
 *   default     — never asked
 *   granted     — allowed, and subscribed
 *   denied      — refused; the browser will not ask again from here, the user
 *                 has to change it in site settings
 *
 * iOS only delivers web push to a PWA the user has added to their home
 * screen, so `needsInstall` says when to tell them that rather than letting
 * the button silently do nothing.
 */
export function usePushNotifications() {
  const [status, setStatus] = useState("default");
  const [busy, setBusy] = useState(false);

  const isIOS =
    typeof navigator !== "undefined" &&
    /iPad|iPhone|iPod/.test(navigator.userAgent);

  const isStandalone =
    typeof window !== "undefined" &&
    (window.matchMedia?.("(display-mode: standalone)").matches ||
      window.navigator.standalone === true);

  const needsInstall = isIOS && !isStandalone && !supported();

  useEffect(() => {
    if (!supported()) {
      setStatus("unsupported");
      return;
    }
    setStatus(Notification.permission);
  }, []);

  const enable = useCallback(async () => {
    if (!supported()) return { ok: false, reason: "unsupported" };

    setBusy(true);
    try {
      const permission = await Notification.requestPermission();
      setStatus(permission);

      if (permission !== "granted") {
        return { ok: false, reason: permission };
      }

      const key = await getPushKey();
      const publicKey = key?.data?.publicKey;

      if (!publicKey) {
        return { ok: false, reason: "not-configured" };
      }

      const registration = await navigator.serviceWorker.register("/sw.js");
      await navigator.serviceWorker.ready;

      /* Reuse the existing subscription when there is one — re-subscribing
         with a different key would silently break delivery. */
      const existing = await registration.pushManager.getSubscription();

      const subscription =
        existing ||
        (await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(publicKey),
        }));

      await subscribeToPush(subscription.toJSON());

      return { ok: true };
    } catch (err) {
      return { ok: false, reason: err.message };
    } finally {
      setBusy(false);
    }
  }, []);

  const disable = useCallback(async () => {
    if (!supported()) return;

    setBusy(true);
    try {
      const registration = await navigator.serviceWorker.getRegistration();
      const subscription = await registration?.pushManager.getSubscription();

      if (subscription) {
        await unsubscribeFromPush(subscription.endpoint);
        await subscription.unsubscribe();
      }
      /* The browser permission itself can only be revoked by the user in site
         settings, so this drops the subscription rather than the grant. */
      setStatus("default");
    } catch {
      /* Nothing useful to tell them — the subscription is gone either way. */
    } finally {
      setBusy(false);
    }
  }, []);

  return { status, busy, enable, disable, needsInstall, supported: supported() };
}

export default usePushNotifications;
