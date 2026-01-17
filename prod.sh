#!/bin/sh

# Add this if you want to build JavaScript with ESBuild - you will need to "npm install -D esbuild"
# node_modules/.bin/esbuild src/js/turbo-admin/main.js --bundle --minify --sourcemap --outfile=public/js/turbo-admin/main.min.js

# Build the site using the PHP builder script using the production environment
echo "Building HTML..."
php ./build.php --prod

# Build Tailwind CSS styles for the site
echo "Building Tailwind CSS"
npm run build:prod

# Cache busting for CSS
echo "Cache-busting files"
NOW=`date +%s`
rm public/css/styles-*.css
cp public/css/styles.css public/css/styles-$NOW.css
# Notes
# 1. The -i flag requires a parameter on MacOS
# 2. This only works on top-level files in public - not in subdirectories
sed -i '' "s#css/styles.css#css/styles\-$NOW\.css#g" public/*.html

echo "Done!"
