@echo off
setlocal

cd /d "%~dp0"

echo PROFO Aankoopbeheer wordt gestart...
echo.
echo Ik controleer eerst of de app al draait.
echo.

powershell -NoProfile -ExecutionPolicy Bypass -Command "$client = New-Object Net.Sockets.TcpClient; try { $client.Connect('127.0.0.1', 5174); $client.Close(); exit 0 } catch { exit 1 }"

if %errorlevel%==0 (
  echo De app draait al. Ik open de browser.
  start "" "http://127.0.0.1:5174/"
  endlocal
  exit /b 0
)

echo Er opent zo een apart venster voor de lokale server.
echo Sluit dat servervenster pas wanneer je klaar bent met werken in de app.
echo.

start "PROFO Aankoopbeheer server" powershell -NoExit -ExecutionPolicy Bypass -Command "Set-Location -LiteralPath '%~dp0'; npm.cmd run dev -- --port 5174 --strictPort"

timeout /t 4 /nobreak >nul
start "" "http://127.0.0.1:5174/"

endlocal
