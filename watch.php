<?php
/**
 * A file watch script that sends server-side events to the client when a file is modified.
 *
 * Requires a build script: `build.sh`
 *
 * This will create files called `.modified_time` - be sure to add this to your `.gitignore` file.
 *
 * Events sent are:
 * - ping: A ping event to keep the connection alive - no data is sent.
 * - buildComplete: A build has completed. This sends a JSON object with a timestamp of the build: { timestamp: 1234567890 }
 */

 // Directories to watch - modify if necessary
 $directories = [
    'src',
 ];

$modifiedFilename = '.modified_time';
$projectModifiedFilename = 'public/' . $modifiedFilename;

 function getDirectoryModifiedTime($directory) {
    // Check if we are running on MacOS
    if (PHP_OS === 'Darwin') {
        return getDirectoryModifiedTimeMac($directory);
    } else {
        return getDirectoryModifiedTimeLinux($directory);
    }
 }

/**
 * Get the modified time of the most recently modified file in a directory (MacOS version).
 *
 * @param  string $directory  The directory to check.
 * @return int
 */
function getDirectoryModifiedTimeMac($directory) {
    global $modifiedFilename;
    exec ("find \"$directory\" -type f -not -name \"$modifiedFilename\" -exec stat -f '%m' {} \; | sort -n | tail -1", $output);
    return (int)$output[0];
}

/**
 * Get the modified time of the most recently modified file in a directory (Linux version).
 *
 * @param  string $directory
 * @return int
 */
function getDirectoryModifiedTimeLinux($directory) {
    global $modifiedFilename;
    exec ("find \"$directory\" -type f -not -name \"$modifiedFilename\" -exec stat -c '%Y' {} \; | sort -n | tail -1", $output);
    return (int)$output[0];
}

header("Cache-Control: no-store");
header("Content-Type: text/event-stream");
header('Access-Control-Allow-Origin: *');

$lastModifiedTime = 0;
$lastRunTime = 0;

exec('./build.sh');
$lastRunTime = time();

ob_implicit_flush(true);
ob_end_flush();

if (! file_exists($projectModifiedFilename)) {
    file_put_contents($projectModifiedFilename, 0);
} else {
    $lastModifiedTime = (int)(file_get_contents($projectModifiedFilename));
}

while (true) {
    if (connection_aborted() === 1) {
        break;
    }
    echo "event: ping\n\n";

    foreach ($directories as $directory) {
        $modifiedTime = getDirectoryModifiedTime($directory);
        if ($modifiedTime > $lastModifiedTime) {
            $lastModifiedTime = $modifiedTime;
        }
    }

    if ($lastModifiedTime > $lastRunTime) {
        exec('./build.sh');
        file_put_contents($projectModifiedFilename, $lastModifiedTime);
        $lastRunTime = $lastModifiedTime;
        echo "event: buildComplete\n";
        echo "data: " . json_encode(['timestamp' => $lastRunTime]) . "\n\n";
    }

    sleep(1);
}
