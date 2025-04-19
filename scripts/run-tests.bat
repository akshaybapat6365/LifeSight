@echo off
echo Running Gemini API diagnostics tests with DEBUG enabled...
echo.

set DEBUG=google-genai:*
set GOOGLE_GENERATIVE_AI_API_KEY=%1

if "%1"=="" (
  echo ERROR: API key not provided
  echo Usage: run-tests.bat YOUR_API_KEY
  exit /b 1
)

echo Creating test image if needed...
if not exist "public\uploads" mkdir "public\uploads"
if not exist "public\uploads\test.png" (
  echo Test image missing, copying from favicon...
  copy "public\favicon.ico" "public\uploads\test.png"
)

echo Running standalone test script...
npx tsx scripts/test-gemini-api.ts

echo.
echo Tests completed! Check the output for error details and recommendations. 