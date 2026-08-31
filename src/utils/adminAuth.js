/* Admin sessions are per tab.
 *
 * localStorage is shared by every tab in a browser, so with one shared key
 * the last admin to sign in anywhere decided which console all of them
 * rendered: a hotel admin refreshing their own page could land in a tour
 * operator's console. The token now lives in sessionStorage, which no other
 * tab can see, so two admins can work side by side on one machine.
 *
 * localStorage keeps a copy purely as a seed. A tab that has never signed in
 * adopts it on first load, which is what keeps the ordinary single-admin case
 * signed in across new tabs and browser restarts. Once a tab has its own
 * token it never reads the seed again, so a later sign-in elsewhere cannot
 * reach back into it.
 */

const TOKEN_KEY = "adminToken";

/* Written by older builds, which stored the whole login response and rendered
   the console from it. The server answers that question now; anything left
   over is cleared so it can never be mistaken for a live session. */
const LEGACY_INFO_KEY = "adminInfo";

export const getAdminToken = () => {
  const own = sessionStorage.getItem(TOKEN_KEY);
  if (own) return own;

  /* First load in this tab — adopt the seed and pin it here. */
  const seed = localStorage.getItem(TOKEN_KEY);
  if (seed) sessionStorage.setItem(TOKEN_KEY, seed);

  return seed;
};

export const saveAdminToken = (token) => {
  sessionStorage.setItem(TOKEN_KEY, token);
  localStorage.setItem(TOKEN_KEY, token);
  localStorage.removeItem(LEGACY_INFO_KEY);
};

export const logoutAdmin = () => {
  sessionStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(LEGACY_INFO_KEY);
};
