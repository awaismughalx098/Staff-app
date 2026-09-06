import { registerPlugin } from "@capacitor/core";

/**
 * GPS from an Android foreground service.
 *
 * This is the only thing in the codebase that can keep reporting after the
 * screen goes off. Not because of Capacitor — Capacitor is just the bridge —
 * but because @capacitor-community/background-geolocation starts a real Android
 * foreground service holding FOREGROUND_SERVICE_LOCATION, and Android does not
 * freeze a process that owns one.
 *
 * The persistent notification is not decoration. It is the price Android
 * charges for the privilege: a foreground service MUST show one, and it is what
 * makes the tracking visible to the driver rather than something happening to
 * their phone without their knowledge.
 *
 * The plugin is registered by name rather than imported from its package, so
 * this module still parses in a web build where the package is not installed.
 * providers/index.js only ever imports it on a native Android platform.
 */
const BackgroundGeolocation = registerPlugin("BackgroundGeolocation");

let watcherId = null;

const toKmh = (metresPerSecond) =>
  Number.isFinite(metresPerSecond) && metresPerSecond >= 0
    ? Math.round(metresPerSecond * 3.6)
    : null;

const normalise = (location) => ({
  latitude: location.latitude,
  longitude: location.longitude,
  speed: toKmh(location.speed),
  heading: Number.isFinite(location.bearing) ? location.bearing : null,
  accuracy: Number.isFinite(location.accuracy) ? Math.round(location.accuracy) : null,
  capturedAt: new Date(location.time || Date.now()).toISOString(),
});

/**
 * What the plugin's error codes mean to a driver.
 *
 * "NOT_AUTHORIZED" is the one that matters: the driver has refused location, or
 * refused it permanently, and no amount of retrying changes that. It has to
 * reach the UI as an instruction, not as a failure to retry.
 */
const describe = (error) => {
  const code = error?.code;

  if (code === "NOT_AUTHORIZED") {
    return {
      kind: "permission",
      permanentlyDenied: true,
      message: "Location permission is required for live trip tracking.",
    };
  }

  return {
    kind: "unavailable",
    permanentlyDenied: false,
    message: "Location tracking is temporarily unavailable. Retrying automatically.",
  };
};

export const androidProvider = {
  id: "android",

  /* The whole reason this file exists. */
  backgroundCapable: true,

  /**
   * The plugin asks for permission as part of addWatcher, and reports refusal
   * through the watcher's error callback rather than a separate call — so this
   * cannot answer definitively before tracking starts. It reports "ask" and the
   * real answer arrives on the first callback.
   */
  async ensurePermission() {
    return { granted: true, permanentlyDenied: false, background: true, deferred: true };
  },

  /**
   * @param {(fix: object) => void} onFix
   * @param {(err: object) => void} onError
   * @param {object} [options]
   * @param {number} [options.distanceFilterM]
   */
  async start(onFix, onError, options = {}) {
    /* Never two watchers. A second one means two foreground services, two
       notifications, and every fix delivered twice — which the queue would
       dutifully store and send. */
    await this.stop();

    watcherId = await BackgroundGeolocation.addWatcher(
      {
        /* Shown in the persistent notification Android requires. Wording is the
           driver's, not the platform's. */
        backgroundTitle: "Let's Goo Transit",
        backgroundMessage: "Live trip tracking is active",

        /* Ask for background permission. Without it Android grants location
           only while the app is in the foreground, which is the problem this
           whole module exists to solve. */
        requestPermissions: true,

        /* Keep reporting when the app is not in front. */
        stale: false,

        /* Metres. The plugin will not report again until the device has moved
           this far, which is the battery lever that matters — the radio, not
           the JavaScript. Set from strategy.trackingProfile so a standing bus
           relaxes and a moving one does not. */
        distanceFilter: Number.isFinite(options.distanceFilterM)
          ? options.distanceFilterM
          : 20,
      },
      (location, error) => {
        if (error) {
          onError?.(describe(error));
          return;
        }
        if (location) onFix(normalise(location));
      }
    );
  },

  async stop() {
    if (!watcherId) return;

    const id = watcherId;
    /* Cleared first, so a failure below cannot leave a stale id that makes the
       next start() think a watcher is already running. */
    watcherId = null;

    try {
      await BackgroundGeolocation.removeWatcher({ id });
    } catch {
      /* Already gone, or the bridge is tearing down. Either way there is
         nothing left to stop. */
    }
  },

  /**
   * Retune without dropping the service.
   *
   * The plugin has no setter for distanceFilter, so this restarts the watcher.
   * Only called when the moving/stationary state actually flips, not on every
   * fix — restarting per fix would cancel and recreate the foreground service
   * continuously.
   */
  async setProfile(profile, onFix, onError) {
    if (!watcherId) return;
    await this.start(onFix, onError, { distanceFilterM: profile?.distanceFilterM });
  },

  /** Whether a foreground service is currently running. */
  isRunning() {
    return watcherId !== null;
  },
};

export default androidProvider;
