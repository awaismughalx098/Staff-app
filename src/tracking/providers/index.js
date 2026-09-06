/**
 * Where a GPS fix comes from.
 *
 * Everything above this line — the queue, the send strategy, the sync and
 * backoff, the trip lifecycle — is platform-independent and knows only this
 * contract. Everything below it is one platform's way of producing a fix.
 *
 * A provider is:
 *
 *   {
 *     id: string
 *     backgroundCapable: boolean   // survives screen-off / app backgrounded
 *     ensurePermission(): Promise<{granted, permanentlyDenied, background}>
 *     start(onFix, onError): Promise<void>
 *     stop(): Promise<void>
 *     setProfile(profile): Promise<void>   // optional, from strategy.js
 *   }
 *
 * A fix is always:
 *
 *   { latitude, longitude, speed, heading, accuracy, capturedAt }
 *
 * with speed in km/h — normalised by each provider, because the browser reports
 * m/s and the Android plugin reports m/s too but only sometimes.
 *
 * iOS is not implemented. It is deliberately absent rather than stubbed: an
 * empty iOS provider that silently reports nothing would be worse than the
 * honest fallback to the web provider, which at least works while the app is
 * open. Adding ./iosProvider.js and one line here is the whole change.
 */

import { webProvider } from "./webProvider.js";

/** Is this build running inside a Capacitor native shell? */
export const isNativePlatform = () => {
  try {
    /* Capacitor injects this global. Read defensively rather than importing
       @capacitor/core at module scope, so the plain web build does not have to
       carry the dependency at all. */
    const cap = globalThis.Capacitor;
    return Boolean(cap?.isNativePlatform?.());
  } catch {
    return false;
  }
};

export const nativePlatformName = () => {
  try {
    return globalThis.Capacitor?.getPlatform?.() || "web";
  } catch {
    return "web";
  }
};

/**
 * The best provider this device can offer.
 *
 * Dynamically imported so the native provider — and the plugin it depends on —
 * is never pulled into the browser bundle. The web build must keep building and
 * running with no Capacitor installed at all.
 */
export const resolveProvider = async () => {
  if (isNativePlatform() && nativePlatformName() === "android") {
    try {
      const { androidProvider } = await import("./androidProvider.js");
      return androidProvider;
    } catch {
      /* The plugin is missing or failed to load. Falling back keeps the trip
         trackable while the app is open rather than leaving the driver with
         nothing, and TrackingService reports the downgrade so the UI can say
         background tracking is unavailable. */
      return webProvider;
    }
  }

  return webProvider;
};
