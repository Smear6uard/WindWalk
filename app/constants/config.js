import Constants from 'expo-constants';

export const MAPBOX_TOKEN = 'your_mapbox_token_here';

/** Dev API base URL: use same host as Metro when on device so the phone can reach your backend. */
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
