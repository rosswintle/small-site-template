#!/bin/sh

# Add this if you want to build JavaScript with ESBuild - you will need to "npm install -D esbuild"
# node_modules/.bin/esbuild src/js/turbo-admin/main.js --bundle --minify --sourcemap --outfile=public/js/turbo-admin/main.min.js

# Build the site using the PHP builder script using the production environment
php ./build.php --prod

# Build Tailwind CSS styles for the site
npm run build:prod
