# small-site-template

A template for a small site using a simple PHP build process, TailwindCSS and AlpineJS

Read about this [in my blog post](https://rosswintle.uk/2022/08/why-i-love-and-how-i-make-simple-static-minimal-tech-websites/).

## Notes

1. This repo is _not_ a library/dependence/framework. It is a template for you to
   copy and user to start a new project. In GitHub there should be a
   "Use this template" button above. Use that to create a new project/repository.
2. It's using HTML, TailwindCSS, and a PHP build script. AlpineJS is included if you want to use it.
3. You will need PHP installed locally. Probably v7.4 or higher. Not sure.

The template comes with:

- A REALLY simple HTML build that allows templates and partials
- Tailwind CSS
- Tailwind Forms plugin
- Tailwind Typography plugin
- AlpineJS
- build.sh script to dev build (no CSS purge)
- prod.sh script to prod build (with CSS purge)
- watch.sh script to watch for changes, rebuild and sort-of live reload

It does NOT come with:

## Usage

Requires node to be installed. Probably a recent version.

If you have a GitHub account, the best way to get started with this repository
is to click the "Use this template" button above. ([Read more about
creating a repository from a template](https://docs.github.com/en/repositories/creating-and-managing-repositories/creating-a-repository-from-a-template))

If you don't have a GitHub account, or don't want to use the GitHub template feature,
you can clone this repository and then remove the `.git` directory to start.

- `git clone git@github.com:rosswintle/small-site-template.git <directory>`
- `cd <directory>`
- `rm -r .git`
- `npm install`
- `./build.sh` or `./prod.sh` or `./watch.sh`

## Templates

You can use a single-level template. The template can include partials and can be passed variables.

A file that uses a template looks like this:

```
<?php extend('../templates/main.html', ['title' => 'Hello World!']) ?>
    <h1>Hello World!</h1>
<?php endExtend() ?>
```

The template file itself looks like this:

```
<!DOCTYPE html>
<html lang="en">

<?php includePart('../parts/head.html', ['title' => $title]) ?>

<body>
    <?= $content ?>
</body>
</html>
```

Note that the content passed to the template is in the `$content` variable and can be echo'ed.

## Partials

Partials can be included and passed an array of variables.

```
<?php includePart('../parts/head.html', ['title' => $title]) ?>
```

## Purging CSS

Note that if you add HTML files in other directories, make sure you add them to the purge list in `tailwind.config.js` and the `$directories` array in `watch.php`
if needed.
