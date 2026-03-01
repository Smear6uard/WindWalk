# Run the WindWalk API server. Use --app-dir so "main" is found from anywhere.
$BackendDir = $PSScriptRoot
$ProjectRoot = Split-Path $BackendDir -Parent
Set-Location $ProjectRoot

# Install backend deps if needed (fastapi, uvicorn, etc.)
pip install -r backend\requirements.txt

python -m uvicorn main:app --host 0.0.0.0 --port 8000 --app-dir backend
