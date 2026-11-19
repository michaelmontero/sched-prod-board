#!/bin/sh
# R6: stamp the current git sha into app/index.html (meta + footer).
sha=$(git rev-parse --short HEAD)
sed -i.bak -E "s/(name=\"build\" content=\")[^\"]*/\1$sha/; s/(data-testid=\"build-sha\">)[^<]*/\1$sha/" app/index.html && rm app/index.html.bak
echo "$sha"
