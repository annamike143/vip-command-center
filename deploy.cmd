@echo off
REM VIP Command Center - Production Deployment Script (Windows)
REM This script handles the complete deployment process to Vercel

echo 🚀 Starting VIP Command Center Production Deployment

REM Check if Vercel CLI is installed
where vercel >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo Installing Vercel CLI...
    npm install -g vercel@latest
)

REM Set environment variables
set NODE_ENV=production
set NEXT_PUBLIC_ENVIRONMENT=production

echo 📦 Installing dependencies...
npm ci
if %ERRORLEVEL% NEQ 0 goto :error

echo 🔍 Running linting...
npm run lint
if %ERRORLEVEL% NEQ 0 goto :error

echo 🔨 Building application...
npm run build
if %ERRORLEVEL% NEQ 0 goto :error

echo 📊 Running bundle analysis...
npm run analyze

echo ☁️ Deploying to Vercel...
vercel --prod --token="3GXCqB9DB1g8M9sFWPjWMaua" --yes
if %ERRORLEVEL% NEQ 0 goto :error

echo 🎯 Setting up domain aliases...
vercel alias set --token="3GXCqB9DB1g8M9sFWPjWMaua" admin.courses.themikesalazar.com
vercel alias set --token="3GXCqB9DB1g8M9sFWPjWMaua" admin.mikesalazaracademy.com

echo 🔥 Deploying Firebase Functions...
cd functions
npm install
firebase deploy --only functions --token="your-firebase-token"
cd ..

echo 🔍 Running post-deployment tests...
npm run performance:test

echo ✅ VIP Command Center deployed successfully!
echo 🌐 Production URL: https://admin.courses.themikesalazar.com
echo 🔧 Admin URL: https://admin.mikesalazaracademy.com

REM Optional: Run Lighthouse audit
echo 🔬 Running Lighthouse audit...
npx lighthouse https://admin.courses.themikesalazar.com --output=html --output-path=lighthouse-report.html --chrome-flags="--headless"

echo 📊 Deployment complete! Check lighthouse-report.html for performance metrics.
goto :end

:error
echo ❌ Deployment failed with error code %ERRORLEVEL%
exit /b %ERRORLEVEL%

:end
