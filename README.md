# DESIGN.md generator - TypeUI

Framer plugin that extracts style specifications from the current project and
generates editable markdown in either:

- `DESIGN.md` format
- `SKILL.md` (TypeUI-compatible) format

## Features

- Extracts colors from Framer Color Styles
- Extracts typography from Framer Text Styles
- Infers spacing and radius values from selected canvas nodes
- Generates editable markdown in a textarea
- Supports copy/download actions
- Persists state via Framer plugin data
- Includes references:
  - Repo: https://github.com/bergside/design-md-framer
  - Explore more design skills: https://www.typeui.sh/design-skills

## Development

```bash
npm run dev
```

## Build

```bash
npm run build
```
