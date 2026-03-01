import Constants from 'expo-constants';

/** Dev API URL: use your machine LAN IP so Expo Go devices can reach backend on port 8000. */
function getDevApiUrl() {
  try {
    const expoConfig = Constants.expoConfig ?? null;
    const hostUri =
      expoConfig?.hostUri ??
      expoConfig?.extra?.expoClient?.hostUri ??
      expoConfig?.extra?.expoGo?.debuggerHost ??
      expoConfig?.debuggerHost ??
      null;

    if (hostUri && typeof hostUri === 'string') {
      const ip = hostUri.split(':')[0];
      if (ip) return `http://${ip}:8000`;
    }
  } catch {
    // Ignore and use localhost fallback.
  }

  return 'http://localhost:8000';
}

export const API_URL =
  typeof process !== 'undefined' && process.env?.EXPO_PUBLIC_API_URL
    ? String(process.env.EXPO_PUBLIC_API_URL).replace(/\/$/, '')
    : __DEV__
      ? getDevApiUrl()
      : 'https://your-railway-url.com';
