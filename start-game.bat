@echo off
setlocal
cd /d "%~dp0"
where node >nul 2>nul
if %errorlevel%==0 (
  node server.js
  exit /b %errorlevel%
)
set "BUNDLED_NODE=%USERPROFILE%\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe"
if exist "%BUNDLED_NODE%" (
  "%BUNDLED_NODE%" server.js
  exit /b %errorlevel%
)
echo Node.js was not found. Please install Node.js or run this inside Codex with the bundled runtime.
exit /b 1
