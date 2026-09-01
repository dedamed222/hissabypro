@echo off
echo ==========================================
echo Auto Save and Push to GitHub and Vercel
echo ==========================================

set /p message="Enter commit message (or press enter for 'Auto update'): "
if "%message%"=="" set message=Auto update

echo.
echo [1/3] Adding changes...
git add .

echo.
echo [2/3] Committing changes...
git commit -m "%message%"

echo.
echo [3/3] Pushing to GitHub (Vercel will auto-deploy)...
git push

echo.
echo ==========================================
echo Done! Check Vercel dashboard for deployment status.
echo ==========================================
pause
