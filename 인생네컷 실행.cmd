@echo off
chcp 65001 >nul
cd /d "%~dp0"

rem QR로 휴대폰에 사진을 보내려면 서버가 같은 Wi-Fi에 열려 있어야 하고,
rem 그건 관리자 권한이 필요합니다. 권한이 없으면 스스로 다시 실행합니다.
net session >nul 2>&1
if %errorlevel% neq 0 (
  echo 휴대폰 QR 기능을 켜려면 관리자 권한이 필요합니다...
  powershell -Command "Start-Process -Verb RunAs -FilePath '%~f0'"
  exit /b
)

start "" http://localhost:5174/photobooth.html
powershell -ExecutionPolicy Bypass -File "%~dp0tools\lanserve.ps1" -Port 5174
pause
