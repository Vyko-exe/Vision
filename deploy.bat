@echo off
cls
echo ===================================
echo Purelike - Cloudflare Pages Deploy
echo ===================================
echo.

REM Install wrangler globally
echo Installing Wrangler CLI...
npm install -g wrangler

echo.
echo ===================================
echo Ready to deploy! Run this command:
echo ===================================
echo.
echo wrangler pages publish dist
echo.
echo Then follow the prompts to log in to your Cloudflare account.
echo.
pause
