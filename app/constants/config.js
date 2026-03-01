import Constants from 'expo-constants';

export const MAPBOX_TOKEN =
  (typeof process !== 'undefined' && process.env?.EXPO_PUBLIC_MAPBOX_TOKEN) ||
  '';

/** Dev API URL: use PC's Wi‑Fi IP when on physical device so the phone can reach the backend.
 *  Avoid 172.17.x, 172.31.x (Docker/WSL) — use your Wi‑Fi adapter IP (e.g. 192.168.1.x). */
function getDevApiUrl() {
  try {
    const manifest = Constants.expoConfig ?? Constants.manifest ?? Constants.manifest2;
    const host = manifest?.debuggerHost ?? manifest?.hostUri;
    if (host && typeof host === 'string') {
      const ip = host.split(':')[0];
      if (ip) return `http://${ip}:8000`;
    }
  } catch (_) {}
  return 'http://localhost:8000';
}

export const API_URL =
  typeof process !== 'undefined' && process.env?.EXPO_PUBLIC_API_URL
    ? String(process.env.EXPO_PUBLIC_API_URL).replace(/\/$/, '')
    : __DEV__
      ? getDevApiUrl()
      : 'https://your-railway-url.com';
