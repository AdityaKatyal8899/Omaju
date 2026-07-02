@echo off
echo Starting OmajuTheChatBot - Consolidated Services
echo ===============================================

echo.
echo Starting Agent Backend (Port 5000)...
start "Agent Backend" cmd /k "cd /d Agent && python app.py"

timeout /t 3 /nobreak >nul

echo Starting Image Gen Backend (Port 8000)...
start "Image Gen Backend" cmd /k "cd /d img_gen && uvicorn main:app --reload"

timeout /t 3 /nobreak >nul

echo Starting Consolidated Next.js Frontend (Port 3000)...
start "Omaju Frontend" cmd /k "cd /d OmajuSignUp\frontend && npm run dev"

echo.
echo Services are starting...
echo.
echo URLs:
echo - Unified Frontend: http://localhost:3000
echo - Agent Backend: http://localhost:5000
echo - Image Gen Backend: http://localhost:8000
echo.
echo Press any key to exit...
pause >nul
