@echo off
REM Commit, push and (optionally) deploy to Vercel from Windows cmd

git add -A

ngit commit -m "Use serverless APIs on Vercel; disable legacy server; fix uploads

Co-authored-by: Copilot <223556219+Copilot@users.noreply.github.com>" || goto :end

git push origin HEAD

where vercel >nul 2>nul
if %ERRORLEVEL%==0 (
  vercel --prod
) else (
  echo Vercel CLI not found. Install with: npm i -g vercel
)
:end
