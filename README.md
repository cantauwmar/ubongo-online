# Polyomino Online Duel (Ubongo-inspiriertes Fan-Projekt)

Eine plattformübergreifende **Polyomino-Puzzle-App** für Android & Web mit Echtzeit-**Sanduhr**, **Edelstein-Wertung** und **Peer-to-Peer Online-Multiplayer (WebRTC)** gegen Freunde.

> **Hinweis:** Dies ist ein inoffizielles, nicht-kommerzielles Hobby- und Lernprojekt, inspiriert vom Brettspiel-Klassiker *Ubongo*. Es steht in keiner Verbindung zum Kosmos Verlag oder dem Spieleautor Grzegorz Rejchtman.

## Features
- **100 % lösbare Polyomino-Boards (`js/generator.js`)**: Ein deterministischer Seed-Generator erzeugt für jede Runde kompakte Legetafeln für **3 Teile (Leicht)**, **4 Teile (Normal)** oder **5 Teile (Profi)** – alle Mitspieler erhalten über den Match-Seed exakt dieselben Voraussetzungen.
- **Intuitive Touch- & Drag-and-Drop-Steuerung (`js/app.js`)**:
  - Teile per Finger oder Maus direkt auf das Raster ziehen (inklusive Echtzeit-Vorschau in Grün/Rot).
  - Oder Teil antippen, über die Buttons **Drehen (90°)** und **Spiegeln** orientieren und auf das Zielraster tippen.
- **Animierte Sanduhr & Soundeffekte (`js/sound.js`)**:
  - Einstellbares Zeitlimit (30s, 45s, 60s, 90s) mit fließendem Sand und akustischem Countdown in den letzten 10 Sekunden (synthetisiert über die Web Audio API).
- **Echtzeit-Online-Modus via WebRTC P2P (`js/network.js`)**:
  - **4-stelliger Raum-Code & Einladungs-Link**: Direktverbindung zwischen Geräten über WebRTC DataChannels (`PeerJS`).
  - **Lokaler Multi-Tab-Modus (`BroadcastChannel`)**: Zum sofortigen Testen auf demselben Gerät über den Button **„2. Tab öffnen“**.
  - **Serverloses WebRTC SDP-Ticket**: Manuelles Offer/Answer Copy-Paste für komplett serverlose Direktverbindungen.

## Lokal starten & testen (Browser / Smartphone)
```bash
git clone https://github.com/cantauwmar/ubongo-online.git
cd ubongo-online
python3 -m http.server 8080
```
Öffne anschließend `http://localhost:8080` im Browser (oder `http://<DEINE-LAN-IP>:8080` auf dem Smartphone und wähle im Browser-Menü **„Zum Startbildschirm hinzufügen / App installieren“** für den Vollbild-PWA-Modus).

## Als native Android-APK bauen (Capacitor)
Falls Node.js & Android Studio installiert sind:
```bash
npm install
npx cap add android
npx cap sync android
cd android && ./gradlew assembleDebug
```
Die fertige APK liegt danach unter `android/app/build/outputs/apk/debug/app-debug.apk`.
