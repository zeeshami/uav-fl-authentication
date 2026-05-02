@echo off
REM start.bat — Windows quick start for the UAV-FL simulation
echo ============================================================
echo   UAV-FL Authentication Simulation — Quick Start (Windows)
echo ============================================================

echo.
echo [1/2] Starting Python backend...
cd fl_simulation
start "UAV-FL Backend" cmd /k "pip install -r requirements.txt --quiet && uvicorn api_server:app --host 0.0.0.0 --port 8765 --reload"
cd ..

timeout /t 3 /nobreak >nul

echo.
echo [2/2] Starting React frontend...
start "UAV-FL Frontend" cmd /k "npm install && npm run dev"

echo.
echo ============================================================
echo   Backend  : http://localhost:8765
echo   API Docs : http://localhost:8765/docs
echo   Frontend : http://localhost:5173
echo ============================================================
echo   Close the opened terminal windows to stop the servers.
pause
