# DESIGN.md Generator for Framer - TypeUI

<img width="1200" height="630" alt="og-framer" src="https://github.com/user-attachments/assets/776b103b-588b-4d10-820f-7fea6ece8901" />

<br/>

This Framer plugin extracts local style signals from the current project and generates editable `DESIGN.md` and `SKILL.md` outputs that you can use with tools such as Google Stitch, Claude Code, Codex, and others to build interfaces with a consistent design-system blueprint. The generated files are based on the open-source [TypeUI DESIGN.md](https://www.typeui.sh/design-md) format.

## Getting started

Run the plugin in Framer:

1. Install dependencies:

   ```bash
   npm install
   ```

2. Start the development server:

   ```bash
   npm run dev
   ```

3. Open the plugin in Framer:
   - Visit **https://framer.com/plugins/open**
   - Select this local development plugin
   - Run **TypeUI** framer plugin

## Curated design skills

Check out curated design systems at [typeui.sh/design-skills](https://www.typeui.sh/design-skills).

## Available actions

| Action | Description |
| --- | --- |
| Auto-extract | Reads local Framer styles and selection signals on load (color styles, text styles, spacing, radius). |
| Generate `DESIGN.md` | Produces editable design-guideline markdown from extracted project signals. |
| Generate `SKILL.md` | Produces editable agent-ready markdown from extracted project signals. |
| Toggle view | Switches between `DESIGN.md` and `SKILL.md` in a single editor panel. |
| Refresh | Regenerates markdown from the current extracted token model. |
| Copy | Copies generated markdown to clipboard. |
| Download | Saves generated output as `DESIGN.md` or `SKILL.md`. |

## Generated file structure

The plugin generates two markdown files with consistent structure.

### `DESIGN.md`

| Section | What it does |
| --- | --- |
| Frontmatter tokens | Captures extracted token primitives: `name`, `colors`, `typography`, `rounded`, and `spacing`. |
| `Overview` | Documents design intent summary. |
| `Colors` | Lists semantic color usage guidance from extracted palette tokens. |
| `References` | Includes repo/version metadata and TypeUI links. |

### `SKILL.md`

| Section | What it does |
| --- | --- |
| Frontmatter metadata | Sets `design-system-[brand-or-scope]` name and skill description. |
| `Mission` | Defines the design-system objective for the extracted project. |
| `Brand` | Captures product/brand context, audience, and surface. |
| `Style Foundations` | Lists inferred visual tokens and foundations. |
| `Accessibility` | Applies WCAG 2.2 AA requirements and interaction constraints. |
| `Writing Tone` | Sets guidance tone for implementation-ready output. |
| `Rules: Do` | Lists required implementation practices. |
| `Rules: Don't` | Lists anti-patterns and prohibited behavior. |
| `Guideline Authoring Workflow` | Defines ordered guideline authoring steps. |
| `Required Output Structure` | Enforces consistent output sections. |
| `Component Rule Expectations` | Defines required interaction/state details. |
| `Quality Gates` | Adds testable quality and consistency checks. |
| `References` | Includes repo/version metadata and TypeUI links. |

## Local development

Common local commands:

```bash
npm run dev
npm run build
npm run lint
npm run pack
```

## License

This project is open-source under the MIT License.
