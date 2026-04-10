# Content Studio — Design System

> **Purpose**: This document is the single source of truth for Claude Code (or any LLM agent) building Content Studio screens. It contains every token, rule, and pattern needed to produce pixel-accurate implementations without guessing. When in doubt, follow this file.

---

## 1. Philosophy & Visual Identity

Content Studio is a desktop content pipeline tool built on a **brutalist-purist** foundation. The interface rejects ornamentation in favor of structural honesty.

**Core tensions that define the look:**

- **Hard structure vs. purposeful color** — Rigid 0px-radius containers, dense uppercase type, and 1px black borders frame a monochrome canvas. Color enters only through stage indicators and the single accent blue, creating a clean information hierarchy.
- **Monochrome dominance** — The entire UI is black, white, and gray. Color is reserved for (a) Kanban stage indicators, (b) the single `#1E3AFF` accent restricted to the wordmark and active navigation, and (c) content type badges.
- **Dense data vs. generous whitespace** — Stat values are intentionally oversized (44px), headlines are compressed with negative tracking, but sections breathe with 24–48px gaps between them.

**Absolute rules:**

1. No shadows, no `box-shadow`, no `filter: blur()`, no `backdrop-filter` — anywhere, ever.
2. No rounded corners except `border-radius: 50%` on avatars and status indicators. All cards, buttons, inputs, and containers use `border-radius: 0`.
3. No photographs or AI-generated images in the chrome. Visual content belongs in user-uploaded context files only.
4. Accent blue `#1E3AFF` is NEVER used for buttons, links, headings, or general UI. It is restricted to the wordmark and active sidebar navigation label.
5. No gradients in the UI chrome. Backgrounds are flat solid colors.
6. No icons in primary navigation — text-only labels. Icons may appear in secondary actions (close buttons, type indicators) but the navigation spine is typographic.

---

## 2. Design Tokens

All values below should be defined as CSS custom properties. Always use the variable names.

### 2.1 Colors

| Token | Value | Usage |
|-------|-------|-------|
| `--bg-primary` | `#F4F4F4` | Page canvas, bars, field backgrounds. NOT white. |
| `--bg-surface` | `#FFFFFF` | Card surfaces, inputs, containers that float on the gray field |
| `--bg-secondary` | `#E8E8E8` | Pressed states, subtle differentiation, metadata tag backgrounds |
| `--bg-sidebar` | `#0F172A` | Sidebar background (dark) |
| `--text-primary` | `#000000` | Headlines, body text, button labels, active navigation |
| `--text-secondary` | `#666666` | Metadata, captions, inactive navigation, section labels |
| `--text-muted` | `#94A3B8` | Tertiary text, counts, timestamps on light backgrounds |
| `--rule-strong` | `#000000` | Card borders, thick dividers |
| `--rule-faint` | `#E5E5E5` | Thin secondary dividers, column separators |
| `--overlay-dark` | `rgba(0,0,0,0.8)` | Modal/dialog scrims |
| `--accent-inverse` | `#FFFFFF` | Text on dark surfaces (sidebar, dark buttons) |
| `--accent-blue` | `#1E3AFF` | Wordmark + active sidebar nav label ONLY |

**Dark surface text (sidebar, modals):**
- Primary: `#FFFFFF`
- Muted: `rgba(255,255,255,0.55)`

**Stage colors (Kanban-specific):**

| Token | Value | Stage |
|-------|-------|-------|
| `--stage-unreviewed` | `#94A3B8` | Unreviewed |
| `--stage-considering` | `#8B5CF6` | Considering |
| `--stage-production` | `#F59E0B` | In Production |
| `--stage-published` | `#10B981` | Published |

Stage colors are used exclusively for stage indicator dots and stage badges. They do not appear in backgrounds, borders, or general UI elements.

**Content type badge colors:**

| Type | Background | Text |
|------|-----------|------|
| Short-form (60-90s) | `#DBEAFE` | `#1E40AF` |
| Long-form (5-10m) | `#EDE9FE` | `#5B21B6` |

### 2.2 Typography

| Token | Value |
|-------|-------|
| `--font-sans` | `'Space Grotesk', -apple-system, system-ui, sans-serif` |
| `--font-mono` | `'JetBrains Mono', ui-monospace, Menlo, monospace` |

**One sans-serif for everything.** No second sans. Monospace is reserved exclusively for timestamps, technical metadata, and code snippets.

### 2.3 Spacing (8px baseline grid)

| Token | Value |
|-------|-------|
| `--space-xs` | `4px` |
| `--space-sm` | `8px` |
| `--space-md` | `16px` |
| `--space-lg` | `24px` |
| `--space-xl` | `48px` |

### 2.4 Layout

| Token | Value |
|-------|-------|
| `--sidebar-width` | `220px` |
| `--chat-panel-width` | `360px` |
| `--context-panel-width` | `340px` |
| `--page-padding` | `24px` |
| `--header-height` | `56px` |

### 2.5 Border weights

| Token | Value |
|-------|-------|
| `--rule-thin` | `1px` |
| `--rule-thick` | `2px` |

---

## 3. Typography Scale

Only two weights: **700** (all headings, labels, buttons, chips, navigation) and **400** (body, captions, metadata values).

| Role | Font | Size | Weight | Letter-spacing | Transform | When to use |
|------|------|------|--------|----------------|-----------|-------------|
| Display | sans | 48px | 700 | -0.04em | UPPERCASE | Hero headings, empty state titles (rare in desktop) |
| Page title | sans | 32px | 700 | -0.02em | — | Top-level view titles (not commonly used — most views use section-level titles) |
| Section title | sans | 18px | 700 | -0.01em | — | Project names in header, card expanded view title |
| Card title | sans | 13–14px | 700 | 0 | — | Kanban card titles, artifact names |
| Body | sans | 14–16px | 400 | -0.01em | — | General reading text, idea summaries, descriptions |
| Body small | sans | 12–13px | 400 | 0 | — | Card descriptions, chat messages, subtitles |
| Section label | sans | 11px | 700 | 0.2em | UPPERCASE | Section headers (ARTIFACTS, CLAUDE ACTIONS, TEAM) |
| Nav label | sans | 12–13px | 700 | 0 | — | Sidebar project names (active state uses 600 weight) |
| Nav section header | sans | 10px | 700 | 0.08em | UPPERCASE | Sidebar section headers (PROJECTS) |
| Chip text | sans | 10–11px | 600 | 0.05em | UPPERCASE | Stage badges, type badges, status badges |
| Meta label | sans | 10–11px | 700 | 0.2em | UPPERCASE | Stat labels, detail labels |
| Caption | sans | 10px | 400–500 | 0.08em | UPPERCASE | Smallest details, file metadata |
| Mono data | mono | 11–13px | 400–500 | varies | — | Timestamps, file sizes, technical metadata |
| Wordmark | sans | 15px | 800 | -0.02em | — | "Macroscope" in sidebar header |
| Wordmark sub | sans | 11px | 400 | 0 | — | "Content Studio" below wordmark |

**Key principles:**
- Aggressive letter-spacing (0.1–0.2em) on all uppercase labels creates a small-caps feel.
- Negative tracking at display sizes (-0.03 to -0.04em) compresses headlines into dense blocks.
- Strongly prefer 400 or 700 for sans-serif. The only exception is weight 500, used sparingly for quiet secondary labels, and 600 for chip text and active nav states.
- Body text inside content areas (idea summaries, demo flows, scripts) uses 14–16px at weight 400 with comfortable line-height (1.6–1.7).

---

## 4. Depth & Elevation Model

Completely flat. Four levels, distinguished only by color and 1px borders:

| Level | Treatment | Use |
|-------|-----------|-----|
| Field | `--bg-primary` (#F4F4F4) | Page canvas, Kanban background |
| Surface | `--bg-surface` (#FFFFFF) + 1px solid `--rule-strong` | Cards, inputs, containers, panels |
| Dark chrome | `--bg-sidebar` (#0F172A) solid | Sidebar, dark buttons |
| Overlay | `--overlay-dark` rgba(0,0,0,0.8) scrim | Modals, confirmation dialogs |

Cards are the primary depth mechanism. A white card with a 1px black border floating on the #F4F4F4 gray field IS the elevation. No shadows needed.

---

## 5. Layout Architecture

### 5.1 Page structure

Content Studio is a **three-zone desktop layout**:

```
┌──────────┬────────────────────────────────────────────────────┐
│          │  Header (56px)                                      │
│  Sidebar │──────────────────────────────────────────────────── │
│  (220px) │                                                     │
│          │  Main Content Area                                  │
│          │  (Kanban board or Expanded card view)                │
│          │                                                     │
│          │                                      ┌────────────┐ │
│          │                                      │ Chat Panel  │ │
│          │                                      │ (360px)     │ │
│          │                                      │ (card view  │ │
│          │                                      │  only)      │ │
│          │                                      └────────────┘ │
└──────────┴────────────────────────────────────────────────────┘
```

- **Outer app frame**: a 1px solid `--rule-strong` border wraps the entire app shell (sidebar + main) at the viewport edges. The whole app reads as a single bordered container — this is the structural baseline that prevents internal rules from looking like stray lines.
- **Sidebar**: Fixed left, full shell height, light `--bg-primary` background with a 1px solid `--rule-strong` right edge.
- **Header**: Spans the main area (not sidebar). Contains view title and primary action. White `--bg-surface` background with a 1px solid `--rule-strong` bottom rule that completes the frame around the top zone.
- **Main content**: Fills remaining space. Gray `--bg-primary` workspace background for data-dense views (Home board, Project detail tickets area).

**Detail views have exactly one structural rule.** The single 1px `--rule-strong` line between the project info block (crumbs + title + metadata + description, on white) and the tickets workspace (header + board + empty state, on gray) is the only rule inside the detail body. Nothing else in the detail view gets a black rule — no rule under column headers, no border around the detail body, no border around the tickets header. Whitespace carries everything else.

### 5.2 Spacing rules

- Page padding: always `--page-padding` (24px) on all sides of the main content area.
- Between Kanban columns: 16px horizontal gap.
- Between cards within a column: 8px vertical gap.
- Between sections within a panel: 16–24px (`--space-md` to `--space-lg`).
- Within grouped data (labels + values, chat messages): 8–12px.
- Section breathing room: 24–48px between major content blocks.

### 5.3 Scroll behavior

Kanban columns scroll vertically within the board area. The expanded card view's content panel and chat panel scroll independently.

```css
.scroll-container {
  flex: 1;
  overflow-y: auto;
  overflow-x: hidden;
}
```

No custom scrollbar styling. System-native scrollbars.

---

## 6. Navigation

### 6.1 Sidebar

```
Width: 220px
Background: --bg-sidebar (#0F172A)
Padding: 20px 0 (top/bottom), 12px (sides for nav items)

Header zone:
  "Macroscope" — 15px/800, color #FFFFFF, letter-spacing -0.02em
  "Content Studio" — 11px/400, color #64748B, margin-top 2px
  Padding: 20px horizontal, 24px bottom margin

Section header:
  "PROJECTS" — 10px/600, color #475569, letter-spacing 0.08em, uppercase
  Padding: 0 8px, margin-bottom 6px

Project items:
  Layout: flex row, icon + text, 10px 8px padding, border-radius 6px
  Icon: 28px square, border-radius 6px, colored bg at 20% opacity, 10px/700 initials
  Name: 12px/400, color #94A3B8 (inactive) or 12px/600, color #FFFFFF (active)
  Subtitle: 10px, color #475569 (e.g., "5 ideas · 4 files")
  Active state: background #1E293B
  Hover state: background #1E293B at 50% opacity

"+ New Project" button:
  1px dashed border #334155, transparent background
  Text: 12px, color #475569

Team avatars (bottom):
  Border-top: 1px solid #1E293B, padding-top 16px
  26px circles, border-radius 50%, 2px solid #0F172A border
  10px/700 white initials on colored backgrounds
```

### 6.2 Header bar

```
Height: 56px
Background: --bg-surface (#FFFFFF)
Border-bottom: 1px solid --rule-strong
Padding: 16px 24px
Layout: flex, space-between, center-aligned

Left: Project icon (36px square, radius 8px — this is the ONE exception
      to 0px radius, as it's an identity mark) + project name (18px/700)
      + summary stats (12px, color #64748B)

Right: Action buttons
  "Context (N)" — secondary button style
  "Generate Ideas" — primary button style
```

### 6.3 Tabs (within expanded card view)

```
Layout: flex row, gap 0
Background: transparent
Border-bottom: 1px solid --rule-faint on the container

Each tab:
  Padding: 8px 16px
  Font: 12px/600 (active) or 12px/400 (inactive)
  Color: --text-primary (active) or --text-muted (inactive)
  Active indicator: 2px solid #3B82F6 bottom border
  Inactive: 2px solid transparent bottom border

"+ Demo Flow" / "+ Script" creation tabs:
  Same padding, 12px/500, color #3B82F6
```

---

## 7. Reusable Components

### 7.1 Card (Kanban)

```css
.kanban-card {
  padding: 12px 14px;
  background: var(--bg-surface);
  border: 1px solid var(--rule-faint);  /* note: faint border on kanban cards, not strong */
  border-radius: 0;
  cursor: pointer;
  transition: border-color 0.15s, background 0.15s;
}
.kanban-card:hover {
  border-color: var(--rule-strong);
}
.kanban-card--selected {
  border: 2px solid #3B82F6;
  background: #F0F4FF;
}
```

Card contents: title (13px/600, color --text-primary) → badges row (type badge + child artifact badges).

### 7.2 Button (primary)

```css
.btn-primary {
  background: #1E293B;        /* NOT pure black — use the sidebar dark tone */
  color: var(--accent-inverse);
  border: none;
  border-radius: 0;
  padding: 8px 16px;
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
}
```

### 7.3 Button (secondary)

```css
.btn-secondary {
  background: var(--bg-surface);
  color: var(--text-secondary);
  border: 1px solid var(--rule-faint);
  border-radius: 0;
  padding: 8px 14px;
  font-size: 12px;
  font-weight: 500;
  cursor: pointer;
}
```

### 7.4 Badge (stage)

```css
.stage-badge {
  font-size: 10px;
  font-weight: 600;
  padding: 2px 8px;
  border-radius: 4px;     /* exception: badges use 4px radius for visual softness */
  background: /* stage color at 10% opacity */;
  color: /* stage color */;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}
```

Badge radius exception: all badges (stage, type, status) use `border-radius: 4px`. This is the only exception to the 0px-radius rule besides avatars and project icons. Badges are informational tokens, not interactive containers.

### 7.5 Badge (content type)

```css
.type-badge {
  font-size: 10px;
  font-weight: 600;
  padding: 2px 6px;
  border-radius: 4px;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  /* Short-form: bg #DBEAFE, color #1E40AF, text "60-90S" */
  /* Long-form: bg #EDE9FE, color #5B21B6, text "5-10M" */
}
```

### 7.6 Badge (artifact status)

```css
.artifact-badge {
  font-size: 10px;
  font-weight: 500;
  padding: 2px 6px;
  border-radius: 4px;
  border: 1px solid /* status color at 25% opacity */;
  color: /* status color */;
  /* complete: #10B981, draft: #F59E0B, not-started: #94A3B8 */
}
```

### 7.7 Quick action chip

```css
.quick-action {
  padding: 4px 10px;
  border-radius: 12px;    /* exception: pills for quick actions */
  border: 1px solid var(--rule-faint);
  background: var(--bg-surface);
  font-size: 11px;
  color: var(--text-secondary);
  cursor: pointer;
  white-space: nowrap;
}
.quick-action:hover {
  background: #F1F5F9;
  border-color: #3B82F6;
  color: #3B82F6;
}
```

Quick action chip radius exception: these use `border-radius: 12px` (pill shape) to visually distinguish them from structural cards and buttons. They are ephemeral suggestions, not persistent UI elements.

### 7.8 Input field

```css
.input {
  padding: 8px 12px;
  border: 1px solid var(--rule-faint);
  border-radius: 0;
  font-family: var(--font-sans);
  font-size: 12px;
  background: var(--bg-surface);
  outline: none;
}
.input:focus {
  border-color: var(--rule-strong);
}
```

### 7.9 Dividers

| Type | CSS | Use |
|------|-----|-----|
| Strong | `1px solid #000000` | Panel borders (sidebar edge), card borders on hover |
| Faint | `1px solid #E5E5E5` | Column separators, tab underlines, section dividers, chat panel border |

### 7.10 Content block (idea summary, demo flow, script)

```css
.content-block {
  padding: 16px 20px;
  background: #F8FAFC;     /* slightly cooler than --bg-primary */
  border: 1px solid var(--rule-faint);
  border-radius: 0;
  font-size: 14px;
  font-weight: 400;
  color: #334155;
  line-height: 1.7;
}
```

For demo flows and scripts (rendered markdown):

```css
.content-block--markdown {
  padding: 20px;
  background: var(--bg-surface);
  border: 1px solid var(--rule-faint);
  font-family: var(--font-sans);  /* NOT mono for body */
  font-size: 13px;
  line-height: 1.8;
  color: #334155;
}
```

Code blocks within markdown content use `--font-mono` at 12px.

### 7.11 Chat message

```css
/* User message */
.chat-msg--user {
  align-self: flex-end;
  max-width: 88%;
  padding: 10px 14px;
  border-radius: 12px;     /* exception: chat bubbles use rounded corners */
  background: #1E293B;
  color: #FFFFFF;
  font-size: 12px;
  line-height: 1.6;
}

/* Assistant message */
.chat-msg--assistant {
  align-self: flex-start;
  max-width: 88%;
  padding: 10px 14px;
  border-radius: 12px;
  background: #F1F5F9;
  color: #334155;
  font-size: 12px;
  line-height: 1.6;
}
```

Chat bubble radius exception: chat messages use `border-radius: 12px` to feel conversational and visually distinct from the structural grid. This is a deliberate contrast — the chat panel is a "soft" zone within the "hard" brutalist frame.

---

## 8. Kanban Board

### 8.1 Column header

```
Layout: flex row, gap 8px, align-items center
Margin-bottom: 12px

Stage dot: 10px circle, border-radius 50%, background: stage color
Stage name: 12px/700, color #334155, uppercase, letter-spacing 0.05em
Count: 11px/400, color --text-muted
```

### 8.2 Column layout

```
Each column: flex: 1, min-width 200px
Cards stack vertically with 8px gap
The Unreviewed column has a "+ Generate more ideas" dashed button at the bottom
```

### 8.3 "+ Generate more ideas" button

```css
.generate-btn {
  width: 100%;
  padding: 10px;
  border: 1px dashed #CBD5E1;
  border-radius: 0;
  background: transparent;
  color: var(--text-muted);
  font-size: 12px;
  cursor: pointer;
  margin-top: 4px;
}
```

---

## 9. Expanded Card View

### 9.1 Structure

When a card is clicked, the board view is replaced (not overlaid) with the expanded view. Layout:

```
┌─────────────────────────────────────────────────────┐
│ ← Back to board          Title    [Stage ▾] [Badge] │  Header
├──────────────────────────────────┬──────────────────┤
│                                  │ ● Claude         │
│  [ Details ] [ Demo ] [ Script ] │   scoped to card │
│  ─────────────────────────────── │                  │
│                                  │  Chat messages    │
│  Content area                    │  ...              │
│  (tab-dependent)                 │                  │
│                                  │  ───────────────  │
│                                  │  [quick actions]  │
│                                  │  [input] [Send]   │
└──────────────────────────────────┴──────────────────┘
```

### 9.2 Back navigation

```
"← Back to board" — 12px/500, color #64748B
Arrow: ← character at 16px, inline with text
No background, no border. Just a text link.
```

### 9.3 Card header

```
Title: 18px/700, color --text-primary
Stage badge + type badge + stage dropdown (select element)
All on one flex row, center-aligned, gap 12px
```

---

## 10. Chat Panel

### 10.1 Structure

```
Width: 360px
Border-left: 1px solid --rule-faint
Background: --bg-surface
Layout: flex column, full height

Header: 12px 16px padding, border-bottom 1px solid --rule-faint
  Status dot (8px, green #10B981, border-radius 50%)
  "Claude" — 12px/700, color --text-primary
  "· scoped to this card" — 11px/400, color --text-muted

Messages area: flex 1, overflow-y auto, padding 16px, column gap 10px

Input area: 12px 16px padding, border-top 1px solid --rule-faint
  Quick action chips row (flex, gap 6px, flex-wrap, margin-bottom 8px)
  Input + Send button row (flex, gap 8px)
```

### 10.2 Empty state

When a card has no chat history:

```
Centered text, padding 40px 20px
"Chat with Claude about this idea. It has full context of the "{project_name}" project."
Font: 12px/400, color --text-muted
```

---

## 11. Context Panel

### 11.1 Structure

```
Width: 340px
Position: absolute, top 0, right 0, bottom 0
Background: --bg-surface
Border-left: 1px solid --rule-faint
Padding: 20px 24px
Overflow-y: auto
z-index: 20 (floats above the board)
```

### 11.2 File list item

```
Layout: flex row, gap 10px, align-items center
Padding: 10px 12px
Border: 1px solid --rule-faint
Border-radius: 0
Margin-bottom: 6px

File type icon: 32px square, border-radius 6px
  DOC: bg #DBEAFE, color #1E40AF
  POST: bg #DCFCE7, color #166534
  IDEA: bg #FEF3C7, color #92400E

Filename: 12px/500, color --text-primary
Metadata: 11px/400, color --text-muted (e.g., "24 KB · Added Apr 7")
```

---

## 12. Border-Radius Exception Summary

The default is `border-radius: 0` on all elements. These are the documented exceptions:

| Element | Radius | Reason |
|---------|--------|--------|
| User avatars | `50%` (circle) | Industry convention for identity marks |
| Stage indicator dots | `50%` (circle) | Small status indicators |
| Chat status dot | `50%` (circle) | Small status indicator |
| Project icon in sidebar | `6px` | Identity mark, visually grouped with avatar convention |
| Project icon in header | `8px` | Larger version of sidebar icon |
| File type icon | `6px` | Small identity mark |
| All badges (stage, type, status) | `4px` | Informational tokens, not structural containers |
| Quick action chips | `12px` (pill) | Ephemeral suggestion tokens |
| Chat bubbles | `12px` | Conversational feel, distinct from structural grid |

Everything else — cards, buttons, inputs, panels, containers, dividers — is `0px`.

---

## 13. Do's and Don'ts

### Do

- Use CSS custom properties (`var(--token)`) for all values
- Use `border-radius: 0` on all structural elements (see §12 for exceptions)
- Use 1px borders as the sole depth mechanism — borders ARE the elevation
- Restrict `#1E3AFF` to the sidebar wordmark and active nav label only
- Use text-only labels in primary navigation
- Use `--page-padding` (24px) consistently on all sides of the main content area
- Use monospace font only for timestamps, file sizes, and technical metadata
- Keep the chat panel visually distinct (rounded bubbles, soft backgrounds) from the structural grid
- Use the 8px spacing grid for all vertical and horizontal rhythm
- Maintain the two-weight type system (400 body / 700 display) with rare 500/600 exceptions

### Don't

- Don't add `box-shadow`, `filter: blur()`, or `backdrop-filter` to any element
- Don't use rounded corners on cards, buttons, inputs, or panels (see §12 for the limited exceptions)
- Don't use `#1E3AFF` for buttons, links, headings, or general UI elements
- Don't use gradients in the UI chrome
- Don't center-align body text
- Don't use weight 600 broadly — it's reserved for chip text and active nav only
- Don't reduce stat values below 44px font-size where stats are displayed
- Don't mix border styles — faint borders for internal dividers, strong borders only on hover/emphasis
- Don't add icons to primary sidebar navigation items
- Don't use color to convey meaning without an accompanying text label (accessibility)
