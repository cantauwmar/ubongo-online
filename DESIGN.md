---
name: UBONGO! Online Speed-Table
description: Tournament speed-puzzling table with recessed warm ivory polyomino board well, live re-ranking gate ticker, and perforated P2P room ticket.
colors:
  accent-amber: "#f59e0b"
  accent-brass: "#d97706"
  accent-emerald: "#34d399"
  accent-crimson: "#dc2626"
  bg-obsidian: "#141311"
  bg-basalt: "#1e1c18"
  bg-basalt-elevated: "#28251f"
  border-slate: "#38332b"
  well-ivory: "#efece4"
  well-ivory-rim: "#dad4c5"
  socket-ivory: "#e2ddd0"
  socket-border: "#bfb8a6"
  text-ivory: "#f5f2eb"
  text-sand: "#c4bba8"
  text-ink: "#1c1a16"
typography:
  display:
    fontFamily: "'Bricolage Grotesque', system-ui, -apple-system, sans-serif"
    fontSize: "1.15rem"
    fontWeight: 800
    lineHeight: 1.15
    letterSpacing: "-0.02em"
  headline:
    fontFamily: "'Bricolage Grotesque', system-ui, -apple-system, sans-serif"
    fontSize: "0.95rem"
    fontWeight: 800
    lineHeight: 1.2
    letterSpacing: "-0.01em"
  body:
    fontFamily: "'Chivo', system-ui, -apple-system, sans-serif"
    fontSize: "0.82rem"
    fontWeight: 600
    lineHeight: 1.4
  label:
    fontFamily: "'Chivo Mono', ui-monospace, monospace"
    fontSize: "0.75rem"
    fontWeight: 700
    lineHeight: 1.2
rounded:
  md: "9px"
  lg: "12px"
  xl: "16px"
spacing:
  xs: "6px"
  sm: "10px"
  md: "14px"
  lg: "18px"
components:
  button-primary:
    backgroundColor: "{colors.accent-amber}"
    textColor: "{colors.bg-obsidian}"
    rounded: "{rounded.md}"
    padding: "6px 10px"
  button-emerald:
    backgroundColor: "{colors.accent-emerald}"
    textColor: "#02180b"
    rounded: "{rounded.md}"
    padding: "6px 10px"
  button-ink:
    backgroundColor: "{colors.text-ink}"
    textColor: "{colors.well-ivory}"
    rounded: "{rounded.md}"
    padding: "6px 10px"
  button-secondary:
    backgroundColor: "{colors.bg-basalt-elevated}"
    textColor: "{colors.text-ivory}"
    rounded: "{rounded.md}"
    padding: "6px 10px"
---

# Design System: UBONGO! Online Speed-Table

## Overview

**Creative North Star: "The Tournament Speed-Table & Split-Flap Gate Board"**

UBONGO! Online Speed-Table treats the screen as a physical tournament puzzle table viewed from directly overhead. Rather than burying gameplay behind mobile menu cards, the first viewport launches straight into the active workspace: a warm obsidian slate table (`#141311`) and basalt panels (`#1e1c18`) framing a high-contrast, die-cut warm ivory puzzle well (`#efece4`). The physical contrast between the dark slate surroundings and the bright ivory target well focuses the player's eye immediately on the geometric silhouette to be tiled.

Above the puzzle well sits a live re-ranking tournament ticker inspired by airport gate boards and Peter Saville's color-coded catalog strips: each competitor's progress is encoded as a compact horizontal row of hue blocks matching the exact KOSMOS Ubongo polyominoes they have placed on the board. Below the hand dock sits a perforated ivory boarding ticket for one-tap WebRTC P2P room creation, link sharing, and code entry.

**Key Characteristics:**
- High-contrast material polarity between the warm obsidian table (`#141311`) and the recessed warm ivory board well (`#efece4`) and perforated P2P boarding pass.
- Authentic 12-hue KOSMOS Ubongo polyomino palette with inner top-edge highlights (`inset 0 2.5px 0 rgba(255,255,255,0.35)`) and integer-aligned grid cells.
- Color-blind-safe 90-degree SVG cross-hatch overlay on invalid or overlapping drop targets.
- Single-viewport portrait ergonomics where hourglass, opponent ticker, puzzle well, gesture toolbar, dealt hand, and P2P ticket fit within `390x844` without vertical scrolling.

## Colors

The palette pairs warm volcanic darks and recessed paper-ivory fields with the 12 canonical KOSMOS Ubongo tile colors.

### Primary
- **Tournament Amber** (`#f59e0b`): Primary action controls (`90° Drehen`, `Spiegeln`, `Beitreten`), hourglass sand fill, and active piece selection borders.
- **Burnished Brass** (`#d97706`): Active filter pills (`3 Teile`, `4 Teile`, `5 Teile`, `30s`, `60s`, `90s`), text selection highlight, and hourglass cap trim.

### Secondary
- **Signal Emerald** (`#34d399`): Positive progression actions (`Neue Tafel`, `Tipp`, `Match starten`) and solved opponent row highlight.

### Tertiary
- **Conflict Crimson** (`#dc2626`): Urgent hourglass alert state (final 10 seconds), destructive board reset button, and 90-degree cross-hatch conflict strokes (`#991b1b`).

### Neutral
- **Obsidian Slate** (`#141311`): Root table background, inset wells, and high-contrast ink on amber buttons.
- **Warm Basalt** (`#1e1c18`): Primary structural containers (header, gate rows, board frame, piece cards).
- **Elevated Basalt** (`#28251f`): Selected piece card ground and secondary button fill.
- **Slate Hairline** (`#38332b`): Structural 1px–1.5px borders across dark containers.
- **Die-Cut Ivory** (`#efece4`): Recessed target board well and perforated P2P multiplayer ticket.
- **Recessed Socket Ivory** (`#e2ddd0`) & **Socket Rim** (`#bfb8a6`): Individual target grid squares waiting to be filled.
- **Warm Ivory Text** (`#f5f2eb`) & **Sand Muted Text** (`#c4bba8`): Primary and secondary typography on dark basalt surfaces.
- **Ticket Ink** (`#1c1a16`): High-contrast text and badges printed on the ivory P2P boarding ticket.

### Named Rules
**The Ivory Polarity Rule.** Warm ivory (`#efece4`) is reserved strictly for the recessed target puzzle well, the perforated P2P room ticket, and the match winner banner. Never dilute that contrast by adding decorative light cards elsewhere on the dark table.

**The Cross-Hatch Conflict Rule.** Invalid or overlapping polyomino placements must never rely on red fill alone; always pair translucent crimson (`rgba(220, 38, 38, 0.22)`) with the 90-degree diagonal SVG cross-hatch pattern so conflicts read unambiguously under any color-vision deficiency.

## Typography

**Display Font:** `Bricolage Grotesque` (weights 700, 800; fallback `system-ui, -apple-system, sans-serif`)
**Body Font:** `Chivo` (weights 400, 600, 700; fallback `system-ui, -apple-system, sans-serif`)
**Label/Mono Font:** `Chivo Mono` (weights 600, 700; fallback `ui-monospace, monospace`)

**Character:** Expressive geometric grotesk headings anchor the board frames, while workhorse sans-serif controls and tabular monospaced numerals (`tabular-nums`) keep countdowns, room codes, rotation angles (`0°`, `90°`, `180°`, `270°`, `FLIP`), and rankings rock-steady during live updates.

### Hierarchy
- **Display** (`800`, `1.15rem`, `1.15` line-height, `-0.02em` tracking): Top tournament masthead title.
- **Headline** (`800`, `0.95rem`, `1.2` line-height): Structural section headers (`Legetafel`, `P2P-Lobby`, `Originale 12 Ubongo-Stanzformen`).
- **Body** (`600`–`700`, `0.78rem`–`0.86rem`, `1.4` line-height): Buttons, player names, piece names, and gesture hints.
- **Label / Tabular Mono** (`700`, `0.75rem`–`1.15rem`, `tabular-nums`): Hourglass countdown, 4-character P2P room codes, piece codes (`I2`..`Y5`), and point totals.

### Named Rules
**The 12px Floor Rule.** No functional label, badge, piece code, or gesture hint may ever render below `0.75rem` (`12px`).

## Layout

The interface operates as a single-screen spatial workbench (`max-width: 1180px`, centered):
- **Mobile Portrait (`< 860px`, target `390x844`):** Compact vertical stack (`gap: 7px`, `padding: 8px 10px 12px`) where the Tournament Header, 2-column Live Gate-Board Ticker, Recessed Ivory Board Well (`34px`–`30px` integer grid cells), 5-column Transform Toolbar, 4-column Dealt Piece Tray, and Perforated P2P Boarding Ticket all fit within the initial `844px` viewport without scrolling.
- **Desktop / Tablet Landscape (`>= 860px`, target `1440x900`):** Two-column asymmetric split (`grid-template-columns: minmax(0, 1.05fr) minmax(0, 0.95fr); gap: 16px`). The left column houses the Recessed Ivory Board Well (`46px`–`35px` cells); the right column stacks the 5-button Transform Toolbar, a 2×2 Dealt Piece Dock, and the Perforated P2P Ticket, with the 12-piece KOSMOS catalog strip spanning full width beneath.

## Elevation & Depth

Depth is physical and structural rather than atmospheric: neutral dark drop shadows lift basalt panels above the obsidian table, while inset shadows carve the ivory target well and its cell sockets downward into the surface. Zero-offset colored neon glows are prohibited.

### Shadow Vocabulary
- **Table Panel Lift** (`box-shadow: 0 8px 22px rgba(0, 0, 0, 0.36)`): Applied to primary work frames and the P2P ticket.
- **Control Elevation** (`box-shadow: 0 3px 8px rgba(0, 0, 0, 0.34)`): Neutral depth under primary amber and emerald action buttons.
- **Recessed Ivory Well** (`box-shadow: inset 0 3px 8px rgba(20, 19, 17, 0.24), 0 1px 0 rgba(255, 255, 255, 0.06)`): Carves the die-cut puzzle well into the basalt frame.
- **Polyomino Tile Bevel** (`box-shadow: inset 0 2.5px 0 rgba(255, 255, 255, 0.35), inset 0 -2px 0 rgba(0, 0, 0, 0.24), 0 2px 4px rgba(20, 19, 17, 0.3)`): Gives each placed or dragged tile tactile board-game thickness.
- **Floating Drag Shadow** (`filter: drop-shadow(0 12px 20px rgba(0, 0, 0, 0.58))`): Lifts an actively dragged polyomino above the board.

## Shapes

- **Outer Frames & Wells:** `16px` (`--radius-xl`) on the board frame; `14px` on the recessed ivory well; `12px` (`--radius-lg`) on the header, piece cards, and P2P ticket.
- **Interactive Controls:** `9px` (`--radius-md`) on action buttons and opponent gate rows; `7px` on segmented rule pills.
- **Polyomino Grid Cells:** `5px` radius on target board cells (`3px` grid gap) and `3px` radius on mini-dock squares (`1.5px` gap).
- **Ticket Perforation:** `12px` circular punch cutouts on left and right edges connected by a `1.5px dashed #bfb8a6` tear line.

## Components

### Buttons
- **Shape:** Gently rounded corners (`9px` radius) with `1.5px solid` highlight borders.
- **Primary (`btn-primary`):** Tournament Amber (`#f59e0b`) fill, `#fde68a` border, `#141311` text, `6px 10px` padding.
- **Emerald (`btn-emerald`):** Signal Emerald (`#34d399`) fill, `#a7f3d0` border, `#02180b` text for high-contrast legibility (>8:1).
- **Ticket Ink (`btn-ink`):** Deep Ink (`#1c1a16`) fill on ivory ticket surfaces with `#efece4` text.

### Live Gate-Board Opponent Row (`.gate-row`)
- **Structure:** Horizontal bar (`padding: 6px 8px`, `9px` radius) displaying rank (`#1`), SVG emblem, player name, a **Saville Hue-Block Strip** (`.hue-code-strip` of `8px × 12px` blocks lighting up in the exact colors of placed polyominoes), and tabular point total.
- **Behavior:** Re-ranks players in place as pieces are placed or when a player calls "UBONGO!" (`.solved-flash`).

### Recessed Ivory Puzzle Well (`.ivory-diecut-well`)
- **Structure:** Warm ivory container (`#efece4`) holding an integer-aligned CSS Grid of recessed target sockets (`#e2ddd0`).
- **States:** Empty target socket (`.cell-target`), placed polyomino cell with exponential ease-out settle animation (`.cell-filled`, `0.18s cubic-bezier(0.22, 1, 0.36, 1)`), valid drop preview (`.cell-ghost-valid`), and 90-degree SVG cross-hatch conflict preview (`.cell-ghost-invalid`).

### Perforated P2P Boarding Ticket (`.p2p-ticket-dock`)
- **Structure:** Two-tier cream/sand ticket (`#efece4` upper stub, `#e6e1d4` lower stub) separated by a dashed perforation with semi-circular side notches. Houses the 4-character room code badge, one-tap P2P link creation/sharing, AI bot addition, room code join input, and player name field.

## Do's and Don'ts

### Do:
- **Do** keep the active puzzle board, hourglass timer, opponent ticker, transform controls, dealt pieces, and P2P ticket visible in the first viewport without requiring a menu screen first.
- **Do** use authored SVG icons in a consistent `2px` stroke weight for all controls, player emblems, and gemstones.
- **Do** support both multi-touch gestures (**Doppeltipp = Spiegeln**, **2-Finger-Tipp / Drehgeste = 90° Drehen**) and visible 1-tap toolbar buttons for accessibility.

### Don't:
- **Don't** use colored glow `box-shadow` halos on dark backgrounds; use neutral black elevation shadows.
- **Don't** use Unicode emoji as UI icons, player avatars, or gemstone indicators.
- **Don't** add uppercase eyebrow/kicker labels above section headings.
