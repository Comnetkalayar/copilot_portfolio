#!/bin/sh

# Commit, push and (optionally) deploy to Vercel
# Run from the project root in a shell that has git and vercel configured.

git add -A

git commit -m "Use serverless APIs on Vercel; disable legacy server; fix uploads

Co-authored-by: Copilot <223556219+Copilot@users.noreply.github.com>" || exit 0

git push origin HEAD

if command -v vercel >/dev/null 2>&1; then
  vercel --prod
else
  echo "Vercel CLI not found. Install: npm i -g vercel" >&2
fi
