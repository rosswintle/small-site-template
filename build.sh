#!/bin/sh

# Add this if you want to build JavaScript with ESBuild
# node_modules/.bin/esbuild src/js/main.js --bundle --minify --sourcemap --outfile=public/js/main.min.js

# Build the site using the PHP builder script
php ./build.php

# Build Tailwind CSS styles for the site
npm run build:dev
