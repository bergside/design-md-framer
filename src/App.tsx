import {
  framer,
  type CanvasNode,
  supportsBorderRadius,
  supportsLayout,
} from "framer-plugin"
import { useEffect, useState } from "react"
import packageJson from "../package.json"
import designBlueprintTemplate from "../DESIGN-MD-BLUEPRINT.md?raw"
import skillBlueprintTemplate from "../SKILL-BLUEPRINT.md?raw"
import "./App.css"

framer.showUI({
  position: "top right",
  width: 560,
  height: 760,
  resizable: true,
  minWidth: 420,
  minHeight: 520,
})

type OutputFormat = "design" | "skill"

interface TypographyToken {
  fontFamily: string
  fontSize: string
}

interface DesignSpec {
  name: string
  colors: {
    primary: string
    secondary: string
    tertiary: string
    neutral: string
  }
  typography: {
    h1: TypographyToken
    bodyMd: TypographyToken
    labelCaps: TypographyToken
  }
  rounded: {
    sm: string
    md: string
  }
  spacing: {
    sm: string
    md: string
  }
  overview: string
}

interface PersistedState {
  format: OutputFormat
  content: string
  spec: DesignSpec
  metrics?: ExtractionMetrics
}

interface ExtractionMetrics {
  colorStylesFound: number
  textStylesFound: number
  selectedNodes: number
  colorTokensFromStyles: number
  typographyTokensFromStyles: number
  radiusValuesFound: number
  spacingValuesFound: number
  colorFallbackDefaults: number
  typographyFallbackDefaults: number
  usedRadiusFallback: boolean
  usedSpacingFallback: boolean
}

interface ColorCandidate {
  id: string
  label: string
  hex: string
  lightness: number
}

interface TypographyCandidate {
  id: string
  label: string
  tag: string
  transform: string
  fontFamily: string
  fontSize: string
  fontSizePx: number
}

const STORAGE_KEY = "typeui-design-generator.state.v1"
const APP_VERSION =
  typeof packageJson.version === "string" ? packageJson.version : "0.0.0"
const REPO_URL = "https://github.com/bergside/design-md-framer"
const TYPEUI_HOME_URL = "https://www.typeui.sh"
const TYPEUI_SKILLS_URL = "https://www.typeui.sh/design-skills"

const DEFAULT_OVERVIEW =
  "Architectural Minimalism meets Journalistic Gravitas. The UI evokes a premium matte finish - a high-end broadsheet or contemporary gallery."

const DEFAULT_COLORS: DesignSpec["colors"] = {
  primary: "#1A1C1E",
  secondary: "#6C7278",
  tertiary: "#B8422E",
  neutral: "#F7F5F2",
}

const DEFAULT_TYPOGRAPHY: DesignSpec["typography"] = {
  h1: { fontFamily: "Public Sans", fontSize: "3rem" },
  bodyMd: { fontFamily: "Public Sans", fontSize: "1rem" },
  labelCaps: { fontFamily: "Space Grotesk", fontSize: "0.75rem" },
}

function createDefaultSpec(name: string): DesignSpec {
  return {
    name,
    colors: { ...DEFAULT_COLORS },
    typography: { ...DEFAULT_TYPOGRAPHY },
    rounded: { sm: "4px", md: "8px" },
    spacing: { sm: "8px", md: "16px" },
    overview: DEFAULT_OVERVIEW,
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null
}

function isTypographyToken(value: unknown): value is TypographyToken {
  if (!isRecord(value)) return false
  return (
    typeof value.fontFamily === "string" && typeof value.fontSize === "string"
  )
}

function isDesignSpec(value: unknown): value is DesignSpec {
  if (!isRecord(value)) return false
  if (typeof value.name !== "string" || typeof value.overview !== "string") {
    return false
  }

  const colors = value.colors
  const typography = value.typography
  const rounded = value.rounded
  const spacing = value.spacing

  if (!isRecord(colors) || !isRecord(typography)) return false
  if (!isRecord(rounded) || !isRecord(spacing)) return false

  return (
    typeof colors.primary === "string" &&
    typeof colors.secondary === "string" &&
    typeof colors.tertiary === "string" &&
    typeof colors.neutral === "string" &&
    isTypographyToken(typography.h1) &&
    isTypographyToken(typography.bodyMd) &&
    isTypographyToken(typography.labelCaps) &&
    typeof rounded.sm === "string" &&
    typeof rounded.md === "string" &&
    typeof spacing.sm === "string" &&
    typeof spacing.md === "string"
  )
}

function isExtractionMetrics(value: unknown): value is ExtractionMetrics {
  if (!isRecord(value)) return false

  return (
    typeof value.colorStylesFound === "number" &&
    typeof value.textStylesFound === "number" &&
    typeof value.selectedNodes === "number" &&
    typeof value.colorTokensFromStyles === "number" &&
    typeof value.typographyTokensFromStyles === "number" &&
    typeof value.radiusValuesFound === "number" &&
    typeof value.spacingValuesFound === "number" &&
    typeof value.colorFallbackDefaults === "number" &&
    typeof value.typographyFallbackDefaults === "number" &&
    typeof value.usedRadiusFallback === "boolean" &&
    typeof value.usedSpacingFallback === "boolean"
  )
}

function parseSavedState(value: string | null): PersistedState | null {
  if (!value) return null

  try {
    const parsed: unknown = JSON.parse(value)
    if (!isRecord(parsed)) return null
    if (!isDesignSpec(parsed.spec)) return null
    if (parsed.format !== "design" && parsed.format !== "skill") return null
    if (typeof parsed.content !== "string") return null

    return {
      format: parsed.format,
      content: parsed.content,
      spec: parsed.spec,
      metrics: isExtractionMetrics(parsed.metrics) ? parsed.metrics : undefined,
    }
  } catch {
    return null
  }
}

function slugify(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
}

function replaceFirst(source: string, target: string, replacement: string): string {
  const index = source.indexOf(target)
  if (index === -1) return source
  return source.slice(0, index) + replacement + source.slice(index + target.length)
}

function appendReferences(markdown: string): string {
  const trimmed = markdown.trimEnd()
  return `${trimmed}

## References

- GitHub repository: ${REPO_URL}
- Version: v${APP_VERSION}
- Explore more design skills from TypeUI: ${TYPEUI_SKILLS_URL}
`
}

function clampChannel(value: number): number {
  return Math.max(0, Math.min(255, Math.round(value)))
}

function componentToHex(value: number): string {
  return clampChannel(value).toString(16).toUpperCase().padStart(2, "0")
}

function toHexColor(input: string): string {
  const value = input.trim()

  const shortHex = /^#([0-9a-f]{3})$/i.exec(value)
  if (shortHex) {
    const [r, g, b] = shortHex[1].split("")
    return `#${r}${r}${g}${g}${b}${b}`.toUpperCase()
  }

  const fullHex = /^#([0-9a-f]{6})/i.exec(value)
  if (fullHex) return `#${fullHex[1]}`.toUpperCase()

  const rgba = /^rgba?\(([^)]+)\)$/i.exec(value)
  if (rgba) {
    const channels = rgba[1]
      .split(",")
      .slice(0, 3)
      .map((part) => Number.parseFloat(part.trim()))
    if (channels.length === 3 && channels.every((channel) => !Number.isNaN(channel))) {
      return `#${componentToHex(channels[0])}${componentToHex(channels[1])}${componentToHex(channels[2])}`
    }
  }

  return value
}

function hexLightness(color: string): number {
  const hex = /^#([0-9a-f]{6})$/i.exec(color)
  if (!hex) return 0

  const raw = hex[1]
  const r = Number.parseInt(raw.slice(0, 2), 16)
  const g = Number.parseInt(raw.slice(2, 4), 16)
  const b = Number.parseInt(raw.slice(4, 6), 16)
  return (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255
}

function parseFontSizeToPx(value: string): number {
  const normalized = value.trim().toLowerCase()
  if (normalized.endsWith("px")) {
    const parsed = Number.parseFloat(normalized.replace("px", ""))
    return Number.isNaN(parsed) ? 16 : parsed
  }
  if (normalized.endsWith("rem")) {
    const parsed = Number.parseFloat(normalized.replace("rem", ""))
    return Number.isNaN(parsed) ? 16 : parsed * 16
  }
  const parsed = Number.parseFloat(normalized)
  return Number.isNaN(parsed) ? 16 : parsed
}

function extractPxNumbers(value: string | null): number[] {
  if (!value) return []
  const matches = value.match(/-?\d*\.?\d+px/g)
  if (!matches) return []
  return matches
    .map((token) => Number.parseFloat(token.replace("px", "")))
    .filter((token) => Number.isFinite(token) && token > 0)
}

function uniqueSorted(values: number[]): number[] {
  return [...new Set(values)].sort((left, right) => left - right)
}

function formatPx(value: number): string {
  const rounded = Math.round(value * 100) / 100
  return `${Number.isInteger(rounded) ? rounded.toFixed(0) : rounded}px`
}

function pickScale(values: number[], defaults: [number, number]): { sm: string; md: string } {
  const sorted = uniqueSorted(values)
  const sm = sorted[0] ?? defaults[0]
  const md = sorted.find((value) => value > sm) ?? defaults[1]
  return { sm: formatPx(sm), md: formatPx(md) }
}

function includesKeyword(label: string, keywords: string[]): boolean {
  return keywords.some((keyword) => label.includes(keyword))
}

function pickColorCandidate(
  candidates: ColorCandidate[],
  used: Set<string>,
  keywords: string[],
): ColorCandidate | null {
  const candidate = candidates.find((entry) => {
    if (used.has(entry.id)) return false
    return includesKeyword(entry.label, keywords)
  })
  if (!candidate) return null
  used.add(candidate.id)
  return candidate
}

function pickTypographyCandidate(
  candidates: TypographyCandidate[],
  used: Set<string>,
  keywords: string[],
  extraMatcher?: (candidate: TypographyCandidate) => boolean,
): TypographyCandidate | null {
  const candidate = candidates.find((entry) => {
    if (used.has(entry.id)) return false
    if (includesKeyword(entry.label, keywords)) return true
    return extraMatcher ? extraMatcher(entry) : false
  })

  if (!candidate) return null
  used.add(candidate.id)
  return candidate
}

function pickClosestBySize(
  candidates: TypographyCandidate[],
  used: Set<string>,
  targetPx: number,
): TypographyCandidate | null {
  const available = candidates.filter((candidate) => !used.has(candidate.id))
  if (!available.length) return null

  available.sort(
    (left, right) =>
      Math.abs(left.fontSizePx - targetPx) - Math.abs(right.fontSizePx - targetPx),
  )
  const chosen = available[0]
  used.add(chosen.id)
  return chosen
}

function toTypographyToken(candidate: TypographyCandidate | null, fallback: TypographyToken): TypographyToken {
  if (!candidate) return fallback
  return {
    fontFamily: candidate.fontFamily,
    fontSize: candidate.fontSize,
  }
}

function renderDesignMarkdown(spec: DesignSpec): string {
  let markdown = designBlueprintTemplate

  markdown = markdown.replace(/^name:\s*.+$/m, `name: ${spec.name}`)

  markdown = markdown.replace(
    /(colors:\n\s*primary:\s*).+(\n\s*secondary:\s*).+(\n\s*tertiary:\s*).+(\n\s*neutral:\s*).+/,
    `$1"${spec.colors.primary}"$2"${spec.colors.secondary}"$3"${spec.colors.tertiary}"$4"${spec.colors.neutral}"`,
  )

  markdown = markdown.replace(
    /(h1:\n\s*fontFamily:\s*).+(\n\s*fontSize:\s*).+/,
    `$1${spec.typography.h1.fontFamily}$2${spec.typography.h1.fontSize}`,
  )
  markdown = markdown.replace(
    /(body-md:\n\s*fontFamily:\s*).+(\n\s*fontSize:\s*).+/,
    `$1${spec.typography.bodyMd.fontFamily}$2${spec.typography.bodyMd.fontSize}`,
  )
  markdown = markdown.replace(
    /(label-caps:\n\s*fontFamily:\s*).+(\n\s*fontSize:\s*).+/,
    `$1${spec.typography.labelCaps.fontFamily}$2${spec.typography.labelCaps.fontSize}`,
  )
  markdown = markdown.replace(
    /(rounded:\n\s*sm:\s*).+(\n\s*md:\s*).+/,
    `$1${spec.rounded.sm}$2${spec.rounded.md}`,
  )
  markdown = markdown.replace(
    /(spacing:\n\s*sm:\s*).+(\n\s*md:\s*).+/,
    `$1${spec.spacing.sm}$2${spec.spacing.md}`,
  )
  markdown = markdown.replace(
    /(## Overview\n\n)([\s\S]*?)(\n\n## Colors)/,
    `$1${spec.overview}$3`,
  )

  markdown = markdown
    .split(DEFAULT_COLORS.primary)
    .join(spec.colors.primary)
    .split(DEFAULT_COLORS.secondary)
    .join(spec.colors.secondary)
    .split(DEFAULT_COLORS.tertiary)
    .join(spec.colors.tertiary)
    .split(DEFAULT_COLORS.neutral)
    .join(spec.colors.neutral)

  return appendReferences(markdown)
}

function renderSkillMarkdown(spec: DesignSpec): string {
  const skillName = slugify(spec.name) || "brand-or-scope"
  const typographyScale = `h1 (${spec.typography.h1.fontFamily} ${spec.typography.h1.fontSize}), body-md (${spec.typography.bodyMd.fontFamily} ${spec.typography.bodyMd.fontSize}), label-caps (${spec.typography.labelCaps.fontFamily} ${spec.typography.labelCaps.fontSize})`
  const spacingScale = `sm ${spec.spacing.sm}, md ${spec.spacing.md}`
  const colorPalette = `primary ${spec.colors.primary}, secondary ${spec.colors.secondary}, tertiary ${spec.colors.tertiary}, neutral ${spec.colors.neutral}`
  const radiusTokens = `radius sm ${spec.rounded.sm}, radius md ${spec.rounded.md}`

  let markdown = skillBlueprintTemplate
  markdown = markdown.replace(
    "name: design-system-[brand-or-scope]",
    `name: design-system-${skillName}`,
  )
  markdown = markdown.replace("# [Design System Name]", `# ${spec.name}`)
  markdown = markdown.replace("- Product/brand: [name]", `- Product/brand: ${spec.name}`)
  markdown = markdown.replace("- Visual style: [keywords]", "- Visual style: premium, editorial, restrained, high-contrast")
  markdown = replaceFirst(markdown, "[token list]", typographyScale)
  markdown = replaceFirst(markdown, "[semantic tokens + values]", colorPalette)
  markdown = replaceFirst(markdown, "[token list]", spacingScale)
  markdown = markdown.replace("[if applicable]", radiusTokens)

  return appendReferences(markdown)
}

function renderMarkdown(format: OutputFormat, spec: DesignSpec): string {
  return format === "design"
    ? renderDesignMarkdown(spec)
    : renderSkillMarkdown(spec)
}

function collectRadiusAndSpacing(selection: CanvasNode[]): { radius: number[]; spacing: number[] } {
  const radius: number[] = []
  const spacing: number[] = []

  for (const node of selection) {
    if (supportsBorderRadius(node) && typeof node.borderRadius === "string") {
      radius.push(...extractPxNumbers(node.borderRadius))
    }

    if (supportsLayout(node)) {
      spacing.push(...extractPxNumbers(node.gap))
      spacing.push(...extractPxNumbers(node.padding))
    }
  }

  return { radius, spacing }
}

function buildExtractionNotes(metrics: ExtractionMetrics): string[] {
  const notes: string[] = []
  notes.push(
    `Scanned ${metrics.colorStylesFound} color styles and ${metrics.textStylesFound} text styles from Framer assets.`,
  )
  notes.push(
    `Mapped tokens from extracted styles: colors ${metrics.colorTokensFromStyles}/4, typography ${metrics.typographyTokensFromStyles}/3.`,
  )
  notes.push(
    `Selection analyzed: ${metrics.selectedNodes} nodes, radius values ${metrics.radiusValuesFound}, spacing values ${metrics.spacingValuesFound}.`,
  )

  const fallbackParts: string[] = []
  if (metrics.colorFallbackDefaults > 0) {
    fallbackParts.push(`color defaults ${metrics.colorFallbackDefaults}`)
  }
  if (metrics.typographyFallbackDefaults > 0) {
    fallbackParts.push(`typography defaults ${metrics.typographyFallbackDefaults}`)
  }
  if (metrics.usedRadiusFallback) fallbackParts.push("radius defaults")
  if (metrics.usedSpacingFallback) fallbackParts.push("spacing defaults")

  if (fallbackParts.length > 0) {
    notes.push(`Fallbacks applied: ${fallbackParts.join(", ")}.`)
  } else {
    notes.push("No defaults were required; all core tokens were derived from project data.")
  }

  return notes
}

function buildSpecBasedNotes(spec: DesignSpec): string[] {
  return [
    "Token model counts: colors 4, typography 3, radius 2, spacing 2.",
    "Generated from extracting Framer color styles, text styles, and selected node layout/radius values.",
    `Current tokens: primary ${spec.colors.primary}, secondary ${spec.colors.secondary}, tertiary ${spec.colors.tertiary}, neutral ${spec.colors.neutral}.`,
  ]
}

async function extractDesignSpec(
  systemName: string,
): Promise<{ spec: DesignSpec; notes: string[]; metrics: ExtractionMetrics }> {
  const [projectInfo, colorStyles, textStyles, selection] = await Promise.all([
    framer.getProjectInfo(),
    framer.getColorStyles(),
    framer.getTextStyles(),
    framer.getSelection(),
  ])

  const resolvedName = systemName.trim() || projectInfo.name.trim() || "Design System"
  const metrics: ExtractionMetrics = {
    colorStylesFound: colorStyles.length,
    textStylesFound: textStyles.length,
    selectedNodes: selection.length,
    colorTokensFromStyles: 0,
    typographyTokensFromStyles: 0,
    radiusValuesFound: 0,
    spacingValuesFound: 0,
    colorFallbackDefaults: 0,
    typographyFallbackDefaults: 0,
    usedRadiusFallback: false,
    usedSpacingFallback: false,
  }

  const colorCandidates: ColorCandidate[] = colorStyles.map((style) => {
    const hex = toHexColor(style.light)
    const label = `${style.name} ${style.path}`.toLowerCase()
    return {
      id: style.id,
      label,
      hex,
      lightness: hexLightness(hex),
    }
  })

  const colors = { ...DEFAULT_COLORS }
  if (colorCandidates.length) {
    const used = new Set<string>()

    const primary =
      pickColorCandidate(colorCandidates, used, [
        "primary",
        "brand",
        "main",
        "ink",
        "text",
        "foreground",
      ]) ?? null

    const secondary =
      pickColorCandidate(colorCandidates, used, [
        "secondary",
        "muted",
        "caption",
        "meta",
        "border",
        "outline",
        "slate",
      ]) ?? null

    const tertiary =
      pickColorCandidate(colorCandidates, used, [
        "tertiary",
        "accent",
        "action",
        "cta",
        "highlight",
        "link",
        "interactive",
      ]) ?? null

    let neutral =
      pickColorCandidate(colorCandidates, used, [
        "neutral",
        "surface",
        "background",
        "canvas",
        "base",
        "paper",
      ]) ?? null

    if (!neutral) {
      const brightest = colorCandidates
        .filter((candidate) => !used.has(candidate.id))
        .sort((left, right) => right.lightness - left.lightness)[0]
      if (brightest) {
        used.add(brightest.id)
        neutral = brightest
      }
    }

    const semanticOrder = [
      ["primary", primary],
      ["secondary", secondary],
      ["tertiary", tertiary],
      ["neutral", neutral],
    ] as const

    const fallback = colorCandidates.filter((candidate) => !used.has(candidate.id))
    for (const [key, candidate] of semanticOrder) {
      if (candidate) {
        colors[key] = candidate.hex
        metrics.colorTokensFromStyles += 1
        continue
      }

      const replacement = fallback.shift()
      if (replacement) {
        colors[key] = replacement.hex
        metrics.colorTokensFromStyles += 1
      } else {
        metrics.colorFallbackDefaults += 1
      }
    }
  } else {
    metrics.colorFallbackDefaults = 4
  }

  const typographyCandidates: TypographyCandidate[] = textStyles
    .map((style) => ({
      id: style.id,
      label: `${style.name} ${style.path}`.toLowerCase(),
      tag: style.tag,
      transform: style.transform,
      fontFamily: style.font.family,
      fontSize: style.fontSize,
      fontSizePx: parseFontSizeToPx(style.fontSize),
    }))
    .sort((left, right) => right.fontSizePx - left.fontSizePx)

  let h1: TypographyCandidate | null = null
  let bodyMd: TypographyCandidate | null = null
  let labelCaps: TypographyCandidate | null = null

  if (typographyCandidates.length) {
    const used = new Set<string>()

    h1 = pickTypographyCandidate(
      typographyCandidates,
      used,
      ["h1", "heading", "hero", "display", "title"],
      (candidate) => candidate.tag === "h1" || candidate.tag === "h2",
    )

    bodyMd = pickTypographyCandidate(
      typographyCandidates,
      used,
      ["body", "paragraph", "copy", "content", "text"],
      (candidate) => candidate.tag === "p",
    )

    labelCaps = pickTypographyCandidate(
      typographyCandidates,
      used,
      ["label", "caption", "meta", "overline", "eyebrow", "caps"],
      (candidate) => candidate.transform === "uppercase",
    )

    if (!h1) {
      h1 = typographyCandidates.find((candidate) => !used.has(candidate.id)) ?? null
      if (h1) used.add(h1.id)
    }
    if (!bodyMd) bodyMd = pickClosestBySize(typographyCandidates, used, 16)
    if (!labelCaps) {
      const remaining = typographyCandidates
        .filter((candidate) => !used.has(candidate.id))
        .sort((left, right) => left.fontSizePx - right.fontSizePx)
      labelCaps = remaining[0] ?? null
      if (labelCaps) used.add(labelCaps.id)
    }
  }

  const typography: DesignSpec["typography"] = {
    h1: toTypographyToken(h1, DEFAULT_TYPOGRAPHY.h1),
    bodyMd: toTypographyToken(bodyMd, DEFAULT_TYPOGRAPHY.bodyMd),
    labelCaps: toTypographyToken(labelCaps, DEFAULT_TYPOGRAPHY.labelCaps),
  }

  metrics.typographyTokensFromStyles = Number(Boolean(h1)) + Number(Boolean(bodyMd)) + Number(Boolean(labelCaps))
  metrics.typographyFallbackDefaults = 3 - metrics.typographyTokensFromStyles

  const { radius, spacing } = collectRadiusAndSpacing(selection)
  metrics.radiusValuesFound = radius.length
  metrics.spacingValuesFound = spacing.length
  metrics.usedRadiusFallback = radius.length === 0
  metrics.usedSpacingFallback = spacing.length === 0

  const spec: DesignSpec = {
    name: resolvedName,
    colors,
    typography,
    rounded: pickScale(radius, [4, 8]),
    spacing: pickScale(spacing, [8, 16]),
    overview: DEFAULT_OVERVIEW,
  }

  return { spec, notes: buildExtractionNotes(metrics), metrics }
}

function fallbackCopy(text: string): void {
  const textarea = document.createElement("textarea")
  textarea.value = text
  textarea.style.position = "fixed"
  textarea.style.opacity = "0"
  textarea.style.pointerEvents = "none"
  document.body.appendChild(textarea)
  textarea.focus()
  textarea.select()

  const copied = document.execCommand("copy")
  document.body.removeChild(textarea)
  if (!copied) throw new Error("Clipboard API unavailable.")
}

async function persistState(state: PersistedState): Promise<void> {
  await framer.setPluginData(STORAGE_KEY, JSON.stringify(state))
}

export function App() {
  const [isLoading, setIsLoading] = useState(true)
  const [format, setFormat] = useState<OutputFormat>("design")
  const [spec, setSpec] = useState<DesignSpec>(() => createDefaultSpec("Design System"))
  const [metrics, setMetrics] = useState<ExtractionMetrics | null>(null)
  const [content, setContent] = useState<string>(() =>
    renderMarkdown("design", createDefaultSpec("Design System")),
  )
  const [notes, setNotes] = useState<string[]>([])

  useEffect(() => {
    let isMounted = true

    const initialize = async () => {
      try {
        const saved = parseSavedState(await framer.getPluginData(STORAGE_KEY))
        if (saved) {
          if (!isMounted) return
          setFormat(saved.format)
          setSpec(saved.spec)
          setMetrics(saved.metrics ?? null)
          setContent(saved.content)
          setNotes(saved.metrics ? buildExtractionNotes(saved.metrics) : buildSpecBasedNotes(saved.spec))
          return
        }

        const projectInfo = await framer.getProjectInfo()
        const initialName = projectInfo.name.trim() || "Design System"
        const fallbackSpec = createDefaultSpec(initialName)

        if (!isMounted) return
        setSpec(fallbackSpec)
        setMetrics(null)
        setNotes(buildSpecBasedNotes(fallbackSpec))
        setContent(renderMarkdown("design", fallbackSpec))

        try {
          const extracted = await extractDesignSpec(initialName)
          if (!isMounted) return
          setSpec(extracted.spec)
          setMetrics(extracted.metrics)
          setNotes(extracted.notes)
          setContent(renderMarkdown("design", extracted.spec))
        } catch {
          if (!isMounted) return
          setNotes(buildSpecBasedNotes(fallbackSpec))
        }
      } finally {
        if (isMounted) setIsLoading(false)
      }
    }

    void initialize()
    return () => {
      isMounted = false
    }
  }, [])

  useEffect(() => {
    if (isLoading) return

    const timeout = window.setTimeout(() => {
      void persistState({ format, content, spec, metrics: metrics ?? undefined })
    }, 300)

    return () => {
      window.clearTimeout(timeout)
    }
  }, [isLoading, format, content, spec, metrics])

  const handleRegenerate = () => {
    setContent(renderMarkdown(format, spec))
    framer.notify("Markdown regenerated from current style model.", {
      variant: "info",
    })
  }

  const handleCopy = async () => {
    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(content)
      } else {
        fallbackCopy(content)
      }
      framer.notify("Copied markdown to clipboard.", { variant: "success" })
    } catch {
      framer.notify("Could not copy markdown.", { variant: "error" })
    }
  }

  const handleDownload = () => {
    const filename = format === "design" ? "DESIGN.md" : "SKILL.md"
    const blob = new Blob([content], { type: "text/markdown;charset=utf-8" })
    const url = URL.createObjectURL(blob)
    const anchor = document.createElement("a")
    anchor.href = url
    anchor.download = filename
    anchor.click()
    URL.revokeObjectURL(url)
    framer.notify(`${filename} downloaded.`, { variant: "success" })
  }

  const outputLabel = format === "design" ? "DESIGN.md" : "SKILL.md"

  if (isLoading) {
    return (
      <main>
        <p className="status">Loading plugin state...</p>
      </main>
    )
  }

  return (
    <main>
      <header className="header">
        <div>
          <h1>DESIGN.md generator - TypeUI</h1>
          <p className="headerSingleRow">
            Automatically extracts local Framer style guidelines and creates editable DESIGN.md and SKILL.md drafts. Built by{" "}
            <a href={TYPEUI_HOME_URL} target="_blank" rel="noreferrer">
              TypeUI
            </a>.
          </p>
        </div>
        <div className="headerMeta">
          <a className="repoLink" href={REPO_URL} target="_blank" rel="noreferrer">
            <svg
              aria-hidden="true"
              viewBox="0 0 16 16"
              width="14"
              height="14"
              fill="currentColor"
            >
              <path d="M8 0a8 8 0 0 0-2.53 15.59c.4.07.55-.17.55-.39v-1.37c-2.24.49-2.71-.95-2.71-.95-.36-.92-.89-1.17-.89-1.17-.73-.5.06-.49.06-.49.8.06 1.22.83 1.22.83.72 1.21 1.88.86 2.34.66.07-.52.28-.86.5-1.06-1.79-.2-3.67-.88-3.67-3.9 0-.86.31-1.57.82-2.12-.08-.2-.35-1.02.08-2.12 0 0 .67-.21 2.2.81a7.5 7.5 0 0 1 4 0c1.53-1.02 2.2-.81 2.2-.81.43 1.1.16 1.92.08 2.12.51.55.82 1.26.82 2.12 0 3.03-1.88 3.7-3.68 3.9.29.25.54.74.54 1.49v2.21c0 .22.14.47.55.39A8 8 0 0 0 8 0Z" />
            </svg>
            <span>GitHub v{APP_VERSION}</span>
          </a>
        </div>
      </header>

      {notes.length > 0 && (
        <section className="notes">
          <p className="notesTitle">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: 6 }}>
              <circle cx="12" cy="12" r="10"></circle>
              <line x1="12" y1="8" x2="12" y2="12"></line>
              <line x1="12" y1="16" x2="12.01" y2="16"></line>
            </svg>
            Extraction notes
          </p>
          <ul>
            {notes.map((note) => (
              <li key={note}>{note}</li>
            ))}
          </ul>
        </section>
      )}

      <section className="controls">
        <label className="field fieldFormat">
          <span>Output format</span>
          <div className="switcher" role="group" aria-label="Output format">
            <button
              type="button"
              className={format === "design" ? "switcherButton active" : "switcherButton"}
              onClick={() => {
                setFormat("design")
                setContent(renderMarkdown("design", spec))
              }}
            >
              DESIGN.md
            </button>
            <button
              type="button"
              className={format === "skill" ? "switcherButton active" : "switcherButton"}
              onClick={() => {
                setFormat("skill")
                setContent(renderMarkdown("skill", spec))
              }}
            >
              SKILL.md
            </button>
          </div>
        </label>
      </section>

      <section className="editorWrap">
        <div className="editorHeader">
          <span className="editorLabel">Editable markdown ({outputLabel})</span>
          <div className="editorActions">
            <button onClick={handleCopy} title="Copy to clipboard">
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: 4 }}>
                <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
              </svg>
              Copy
            </button>
            <button onClick={handleDownload} title="Download file">
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: 4 }}>
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                <polyline points="7 10 12 15 17 10"></polyline>
                <line x1="12" y1="15" x2="12" y2="3"></line>
              </svg>
              Download
            </button>
            <button onClick={handleRegenerate} title="Regenerate markdown">
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: 4 }}>
                <polyline points="23 4 23 10 17 10"></polyline>
                <polyline points="1 20 1 14 7 14"></polyline>
                <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"></path>
              </svg>
              Refresh
            </button>
          </div>
        </div>
        <textarea
          className="editor"
          spellCheck={false}
          value={content}
          onChange={(event) => setContent(event.target.value)}
        />
      </section>

      <footer className="footer">
        <a href={TYPEUI_SKILLS_URL} target="_blank" rel="noreferrer">
          Find more curated design skills at TypeUI and improve UI generation
          with AI.
        </a>
      </footer>
    </main>
  )
}
