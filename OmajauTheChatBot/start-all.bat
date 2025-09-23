@echo off
echo Starting OmajuTheChatBot - All Services
echo =====================================

echo.
echo Starting OmajuSignUp Backend (Port 5001)...
start "OmajuSignUp Backend" cmd /k "cd /d OmajuSignUp\backend && npm start"

timeout /t 3 /nobreak >nul

echo Starting OmajuSignUp Frontend (Port 3001)...
start "OmajuSignUp Frontend" cmd /k "cd /d OmajuSignUp\frontend && npm run dev"

timeout /t 3 /nobreak >nul

echo Starting Agent Backend (Port 5000)...
start "Agent Backend" cmd /k "cd /d Agent && python app.py"

timeout /t 3 /nobreak >nul

echo Starting Agent Frontend (Port 3000)...
start "Agent Frontend" cmd /k "cd /d Agent\Agentfrontend && npm run dev"

echo.
echo All services are starting...
echo.
echo URLs:
echo - OmajuSignUp Frontend: http://localhost:3001
echo - Agent Frontend: http://localhost:3000
echo - OmajuSignUp Backend: http://localhost:5001
echo - Agent Backend: http://localhost:5000
echo.
echo Press any key to exit...
pause >nul
