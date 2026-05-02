@echo off
echo ============================================================
echo   UAV-FL Authentication Backend — Starting FastAPI Server
echo ============================================================
cd /d "%~dp0"
pip install fastapi uvicorn --quiet
echo.
echo   Server URL : http://localhost:8765
echo   WebSocket  : ws://localhost:8765/ws
echo   API Docs   : http://localhost:8765/docs
echo.
uvicorn api_server:app --host 0.0.0.0 --port 8765 --reload
pause
