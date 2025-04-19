#!/bin/bash
echo "Running Gemini API diagnostics tests with DEBUG enabled..."
echo

if [ $# -eq 0 ]; then
  echo "ERROR: API key not provided"
  echo "Usage: ./run-tests.sh YOUR_API_KEY"
  exit 1
fi

export DEBUG="google-genai:*"
export GOOGLE_GENERATIVE_AI_API_KEY="$1"

echo "Creating test image if needed..."
mkdir -p public/uploads
if [ ! -f "public/uploads/test.png" ]; then
  echo "Test image missing, copying from favicon..."
  cp public/favicon.ico public/uploads/test.png
fi

echo "Running standalone test script..."
npx tsx scripts/test-gemini-api.ts

echo
echo "Tests completed! Check the output for error details and recommendations." 