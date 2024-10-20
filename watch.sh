echo "Performing initial build"
./build.sh
echo "Starting PHP watch server on localhost:8008"
echo "Press Ctrl+\ to stop the server"
php -S localhost:8008 watch.php
