# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

Friends and board-game players on Android phones and mobile/desktop browsers who want fast, head-to-head spatial puzzle duels against friends over the internet without accounts or server setup, as well as solo practice against the hourglass.

## Product Purpose

Ubongo! Online Duel brings the tactile speed-puzzling tension of the classic KOSMOS Ubongo board game to Android (APK) and mobile web: players race an animated hourglass to tile a target polyomino silhouette using a dealt subset of the 12 original Ubongo pieces, earning ranked gemstones (Ruby, Sapphire, Emerald, Amber) based on solve speed.

## Positioning

Zero-backend peer-to-peer multiplayer (WebRTC DataChannels via shareable invite links and 4-character room codes) paired with deterministic seeded board generation that guarantees 100% solvable, identical puzzle rounds across all connected devices.

## Operating Context

Used primarily one- or two-handed on Android portrait screens in short bursts (30–90 second rounds across 3–7 round matches). Friends share a direct HTTPS or deep-link room invite (`?room=CODE`) via chat apps and jump straight into a synchronized lobby.

## Capabilities and Constraints

- Exact 12 original KOSMOS Ubongo polyomino shapes (1 domino, 2 trominoes, 4 tetrominoes, 5 pentominoes) with their canonical distinct colors and square counts (2 to 5 squares).
- Deterministic seeded puzzle generator for 3-piece (Leicht), 4-piece (Normal), and 5-piece (Profi) target boards.
- Direct touch manipulation:
  - Drag & drop onto the target grid with magnetic snap preview.
  - **Double-tap (Doppeltipp)** on a piece flips/mirrors it (`⇄`).
  - **2-finger tap or 2-finger twist gesture (2-Finger-Tipp / 2-Finger-Drehgeste)** rotates the piece in 90° increments (`↻`), alongside dedicated on-screen action controls.
- Animated hourglass timer (30s, 45s, 60s, 90s) with live opponent progress bars (pieces placed and "UBONGO!" callouts).
- Packaged both as a standalone Android `.apk` (with deep-link intent filter for P2P lobby links) and hosted via GitHub Pages (`cantauwmar/ubongo-online`) for permanent cross-network P2P invite links.

## Evidence on Hand

- Working deterministic puzzle generator, WebRTC P2P networking layer (`PeerJS` + `BroadcastChannel` + manual SDP fallback), and Web Audio synthesized sound/haptic engine in `/home/r/.gemini/antigravity/scratch/ubongo-online`.

## Product Principles

1. **Board-First Ergonomics:** The target grid, active hourglass, live opponent progress, and hand pieces must all fit within a single non-scrolling portrait viewport during active play.
2. **Tactile Gesture Immediate Feedback:** Double-tap to flip and two-finger rotate/tap to turn must respond instantaneously with crisp visual orientation cues and haptic/audio confirmation.
3. **Frictionless P2P Entry:** Sharing a room link must drop a friend straight into the active lobby on both the Android APK and mobile web without login walls.
