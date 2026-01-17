#!/bin/sh

# Add this if you want to build JavaScript with ESBuild
# node_modules/.bin/esbuild src/js/main.js --bundle --minify --sourcemap --outfile=public/js/main.min.js

# Build the site using the PHP builder script
echo "Building HTML..."
php ./build.php

# Build Tailwind CSS styles for the site
echo "Building Tailwind CSS"
npm run build:dev

echo "Done!"
echo "Don't forget to use prod.sh if you're building for a commit/deploy!"
