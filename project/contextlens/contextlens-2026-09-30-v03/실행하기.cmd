@echo off
chcp 65001 >nul
cd /d "%~dp0"
if not exist ".venv\Scripts\python.exe" (
  echo 첫 실행 준비 중입니다. 잠시 기다려 주세요.
  python -m venv .venv
  if errorlevel 1 goto setup_error
)
".venv\Scripts\python.exe" -c "import yt_dlp, bs4" >nul 2>&1
if errorlevel 1 (
  ".venv\Scripts\python.exe" -m pip install --disable-pip-version-check -r requirements.txt
  if errorlevel 1 goto setup_error
)
echo 브라우저에서 ContextLens를 엽니다. 이 창을 닫으면 도구가 종료됩니다.
".venv\Scripts\python.exe" app.py --open
pause
exit /b 0
:setup_error
echo 실행 준비를 마치지 못했습니다. Python 설치와 인터넷 연결을 확인해 주세요.
pause
exit /b 1
