# UBONGO! Online Duel (Android PWA + Capacitor + WebRTC P2P)

Eine vollständige **Ubongo-Polyomino-Puzzle-App** für Android & Web mit animierter **Sanduhr**, **Edelstein-Wertung** und **Peer-to-Peer Online-Multiplayer (WebRTC)** gegen Freunde.

## Features
- **100% lösbare Polyomino-Boards (`js/generator.js`)**: Deterministischer Seed-Generator erzeugt für jede Runde kompakte Ubongo-Legetafeln für **3 Teile (Leicht)**, **4 Teile (Normal)** oder **5 Teile (Profi)** – alle Mitspieler erhalten über den Match-Seed exakt dieselben Voraussetzungen.
- **Intuitive Touch- & Drag-and-Drop-Steuerung (`js/app.js`)**:
  - Teile per Finger/Maus direkt auf das Raster ziehen (mit Echtzeit-Vorschau in Grün/Rot).
  - Oder Teil antippen, über die Buttons **↻ Drehen (90°)** und **⇄ Spiegeln** orientieren und auf das Zielraster tippen.
- **Animierte Sanduhr & Soundeffekte (`js/sound.js`)**:
  - Einstellbares Zeitlimit (30s, 45s, 60s, 90s) mit fließendem Sand und akustischem Countdown in den letzten 10 Sekunden.
- **Echtzeit-Online-Modus via WebRTC P2P (`js/network.js`)**:
  - **4-stelliger Raum-Code & Einladungs-Link**: Direktverbindung zwischen Geräten über WebRTC DataChannels (`PeerJS` + Google STUN).
  - **Lokaler Multi-Tab-Modus (`BroadcastChannel`)**: Zum sofortigen Testen auf demselben Gerät über den Button **„🗔 2. Tab öffnen“**.
  - **Serverloses WebRTC SDP-Ticket**: Manuelles Offer/Answer Copy-Paste für komplett serverlose Direktverbindungen.

## Starten & Testen (Sofort im Browser / Handy)
```bash
cd /home/r/.gemini/antigravity/scratch/ubongo-online
python3 -m http.server 8080
```
Öffne anschließend `http://localhost:8080` im Browser (oder `http://<DEINE-LAN-IP>:8080` auf deinem Android-Smartphone und wähle im Browser-Menü **„Zum Startbildschirm hinzufügen / App installieren“** für den Vollbild-App-Modus).

## Als native Android-APK bauen (Capacitor)
Falls Node.js & Android Studio installiert sind:
```bash
npm install
npx cap add android
npx cap sync android
cd android && ./gradlew assembleDebug
```
Die fertige APK liegt danach unter `android/app/build/outputs/apk/debug/app-debug.apk`.
