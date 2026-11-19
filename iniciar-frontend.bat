@echo off
setlocal
cd /d "%~dp0"
if not exist ".next\BUILD_ID" (
  call npm run build
  if errorlevel 1 exit /b 1
)
call npx next start -p 3000
exit /b %errorlevel%
