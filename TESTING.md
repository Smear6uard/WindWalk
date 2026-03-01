# Testing WindWalk (including on iPhone)

Your testing can fail if any of these are missing. Use this checklist.

## 1. Backend Python dependencies

The backend (FastAPI) needs its packages installed. From the **project root**:

```powershell
pip install -r backend\requirements.txt
```

If you use a virtual environment, activate it first, then run the above.

Without this you get: **"No module named 'fastapi'"** or **"Could not import module 'main'"**.

---

## 2. Backend server must be running

Start the API before (or while) using the app:

**Option A – from project root (recommended):**
```powershell
.\backend\run.ps1
```

**Option B – manually from project root:**
```powershell
pip install -r backend\requirements.txt
python -m uvicorn main:app --host 0.0.0.0 --port 8000 --app-dir backend
```

- `--app-dir backend` is required so Python finds `main.py`.
- `--host 0.0.0.0` is required for testing on a **physical device** (e.g. iPhone) so the phone can reach your computer.

If the backend isn’t running or isn’t reachable, you get **"Weather unavailable"** and routing won’t work.

---

## 3. Testing on iPhone (Expo Go)

- iPhone and computer must be on the **same Wi‑Fi**.
- Backend must be started with **`--host 0.0.0.0`** (the script above does this).
- Start the app: from project root run `npm start`, then scan the QR code with your iPhone camera to open in Expo Go.

If the app still shows **"Weather unavailable"** on the phone:

- Set your computer’s IP explicitly. In project root (or in `app`), create or edit `.env` and add:
  ```env
  EXPO_PUBLIC_API_URL=http://YOUR_PC_IP:8000
  ```
  Replace `YOUR_PC_IP` with your PC’s IPv4 address (e.g. `192.168.1.5`). On Windows: `ipconfig` → Wi‑Fi adapter → IPv4 Address.
- Restart Expo after changing `.env` (`npm start` again).

---

## 4. Optional: real weather and maps

- **Weather:** Copy `backend\.env.example` to `backend\.env` and set `OPENWEATHERMAP_API_KEY`. Without it, the app uses mock weather.
- **Maps:** In `app/constants/config.js`, set `MAPBOX_TOKEN` for real map tiles. The app may still run with a placeholder.

---

## Quick checklist

| Step | Command / action |
|------|-------------------|
| 1 | `pip install -r backend\requirements.txt` |
| 2 | `.\backend\run.ps1` (leave this terminal open) |
| 3 | In another terminal: `npm start` |
| 4 | Open the app in Expo Go (or simulator) and test |

If anything still fails, the most common causes are: backend deps not installed, backend not running, or (on device) wrong Wi‑Fi or missing `EXPO_PUBLIC_API_URL` with your PC’s IP.
