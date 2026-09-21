# learn-docker

Interactive Docker visualizer, sandbox, and tutorial game.
Product pattern inspired by [learnGitBranching](https://github.com/pcottle/learnGitBranching) — rebuilt for containers.

**Live:** https://alisadeghiaghili.github.io/learn-docker/

Type Docker CLI commands in a terminal. A simulated daemon updates a multi-zone schematic (registry, image layers, containers, volumes, networks). Guided levels teach the mental models that the real CLI leaves invisible.

## Quick start

```bash
npm install
npm run dev
```

Open the printed local URL (default `http://localhost:5173`).

```bash
npm test
npm run build
npm run preview
```

## GitHub Pages

Pushes to `main` deploy automatically via `.github/workflows/deploy-pages.yml`:
tests run, Vite builds with `base: /learn-docker/`, and the `dist/` folder is published.

Production build locally:

```bash
GITHUB_PAGES=true npm run build
```

Then serve `dist/` from any static host (or open via Pages URL after deploy).

## What works

- Sandbox mode with simulated `docker` commands
- Levels with win conditions and command golf (par)
- `undo` / `reset`, object inspector, progress in `localStorage`
- Images, containers, volumes, networks, port publish, `docker build` layers

## Scope

This is a client-side simulator, not a Docker daemon bridge. No real containers run. Deferred vs a full tutorial platform: level builder UI, gist permalinks, i18n.

## Architecture

- `src/engine/` — state machine + CLI parser + level checks
- `src/levels/` — curriculum definitions
- `src/ui/` — React shell, schematic SVG, terminal, dialogs

## License

Licensed under the Apache License, Version 2.0. See [LICENSE](LICENSE).
