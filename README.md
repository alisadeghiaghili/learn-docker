# learn-docker

Interactive Docker visualizer, sandbox, and tutorial game.

Type Docker CLI commands in a terminal. A simulated daemon updates a multi-zone schematic (registry, image layers, containers, volumes, networks). Guided levels teach the mental models that the real CLI leaves invisible.

**Live:** https://alisadeghiaghili.github.io/learn-docker/

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

## What works

- Sandbox mode with simulated `docker` commands
- Levels with teaching notes, step checklists, and command golf (par)
- Level-clear celebration with LinkedIn / X / Facebook share + learned curriculum list
- Word-wise Tab completion, ↑/↓ command history, sticky prompt focus
- Progress saved in `localStorage` + cookie (resume next week)
- `undo` / `reset`, object inspector
- Images, containers, volumes, networks, port publish, `docker build` layers

## Scope

This is a client-side simulator, not a Docker daemon bridge. No real containers run. Deferred: level builder UI, gist permalinks, i18n.

## Architecture

- `src/engine/` — state machine + CLI parser + level checks
- `src/levels/` — curriculum definitions (teaching, steps, outcomes)
- `src/ui/` — React shell, schematic SVG, terminal, celebration, share

## License

Licensed under the Apache License, Version 2.0. See [LICENSE](LICENSE).
