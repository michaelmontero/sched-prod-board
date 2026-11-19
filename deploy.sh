#!/bin/sh
# Stage app/ into dist/, stamp the git sha (R6), deploy dist/ to Railway.
set -e
[ -z "$(git status --porcelain app)" ] || { echo "commit app/ first"; exit 1; }
sha=$(git rev-parse --short HEAD)
rm -rf dist && cp -R app dist
sed -i '' -E "s/(name=\"build\" content=\")[^\"]*/\1$sha/; s/(data-testid=\"build-sha\">)[^<]*/\1$sha/" dist/index.html
printf '{"private":true,"scripts":{"start":"serve -l tcp://0.0.0.0:${PORT:-3000} ."},"dependencies":{"serve":"14.2.4"}}\n' > dist/package.json
railway up dist --path-as-root --ci --service sched-prod-board
echo "deployed $sha"
