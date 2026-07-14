# Puffin-16M website source

This directory contains the React/TypeScript source used to generate the static
GitHub Pages site in the parent directory.

The deployed site assets (`data`, `images`, and `models`) live one level above
this source directory to avoid duplicating the large preview files in Git.

The production site is built with Vite using the base path:

```text
/projects/puffin-16m/
```

To rebuild the JavaScript and CSS bundles:

```bash
npm ci
npm run build:static
```

Then copy the generated `dist-static/index.html` and `dist-static/assets`
contents into the parent `puffin-16m` directory. The existing dataset previews,
videos, images, and 3D model files remain in place.

The canonical Puffin-16M dataset remains hosted on Hugging Face:

```text
https://huggingface.co/datasets/KangLiao/Puffin-16M
```
