/**
 * Main Application & Gameplay Controller for Ubongo! Online Duel
 */

import { transformCoords, getBounds } from './pieces.js';
import { generateUbongoPuzzle } from './generator.js';
import { UbongoNetwork } from './network.js';
import { sound } from './sound.js';

const AVATARS = ['🦁', '🐆', '🦓', '🐘', '🦜', '🐊', '🐒', '🦏'];

// Classic Ubongo Gem Tiers for 1st, 2nd, 3rd, 4th+ finishers within the hourglass time
const GEM_TIERS = [
  { rank: 1, name: 'Rubin', icon: '♦️', color: '#ef4444', points: 4 },
  { rank: 2, name: 'Saphir', icon: '🔷', color: '#3b82f6', points: 3 },
  { rank: 3, name: 'Smaragd', icon: 'Emerald', emoji: '🟢', color: '#10b981', points: 2 },
  { rank: 4, name: 'Bernstein', icon: '🟠', color: '#f59e0b', points: 1 }
];

class UbongoApp {
  constructor() {
    this.mode = 'menu'; // 'menu' | 'lobby' | 'game' | 'round_summary' | 'match_over'
    this.isSolo = false;

    // Match Settings (configurable by Host or in Solo setup)
    this.settings = {
      difficulty: 4,      // 3 = Leicht (3 Teile), 4 = Normal (4 Teile), 5 = Profi (5 Teile)
      timeLimit: 60,      // Hourglass seconds (30, 45, 60, 90)
      totalRounds: 5,     // Number of rounds per match (3, 5, 7)
      matchSeed: 'UBG-' + Math.floor(10000 + Math.random() * 89999)
    };

    // Players map: playerId -> { id, name, avatar, isHost, isBot, score, gems: [], placedCount, totalPieces, solvedTime, solvedRank }
    this.players = new Map();

    // Current Round State
    this.currentRound = 1;
    this.puzzle = null;
    this.timeLeft = 60;
    this.timerInterval = null;
    this.roundStartTime = 0;
    this.roundFinished = false;
    this.finishOrder = []; // playerIds in order of solving this round

    // Local Player Board State
    // pieceStates: pieceId -> { piece, rotation, flipped, placed: boolean, gridX: number|null, gridY: number|null }
    this.pieceStates = new Map();
    this.selectedPieceId = null;

    // Drag & Drop State
    this.dragState = null; // { pieceId, pointerId, startX, startY, currentX, currentY, hoverGridX, hoverGridY, isValid }

    // Bot simulation timer
    this.botInterval = null;

    // Initialize Network
    this.net = new UbongoNetwork({
      onPacket: (packet) => this.onNetworkPacket(packet),
      onStatus: (statusText) => this.updateNetworkStatusUI(statusText)
    });

    this.initDOM();
    this.checkURLRoomInvite();
  }

  initDOM() {
    // Profile inputs
    const nameInput = document.getElementById('player-name-input');
    if (nameInput) {
      nameInput.value = this.net.playerName;
      nameInput.addEventListener('input', (e) => {
        this.net.setProfile(e.target.value, this.net.playerAvatar);
        this.syncSelfInPlayers();
      });
    }

    this.renderAvatarPicker();

    // Main Menu Buttons
    document.getElementById('btn-solo-start')?.addEventListener('click', () => {
      sound.init();
      this.startSoloMode();
    });

    document.getElementById('btn-create-room')?.addEventListener('click', () => {
      sound.init();
      this.createOnlineRoom();
    });

    document.getElementById('btn-join-room')?.addEventListener('click', () => {
      sound.init();
      const input = document.getElementById('join-code-input');
      const code = input ? input.value.trim().toUpperCase() : '';
      if (!code || code.length < 3) {
        this.showToast('Bitte gib einen gültigen Raum-Code ein!');
        return;
      }
      this.joinOnlineRoom(code);
    });

    // Difficulty & Timer selectors on Menu/Lobby
    document.querySelectorAll('[data-difficulty]').forEach((btn) => {
      btn.addEventListener('click', () => {
        if (this.mode === 'lobby' && !this.net.isHost) return;
        this.settings.difficulty = Number(btn.dataset.difficulty);
        this.updateSettingsUI();
        this.broadcastLobbyState();
      });
    });

    document.querySelectorAll('[data-timelimit]').forEach((btn) => {
      btn.addEventListener('click', () => {
        if (this.mode === 'lobby' && !this.net.isHost) return;
        this.settings.timeLimit = Number(btn.dataset.timelimit);
        this.updateSettingsUI();
        this.broadcastLobbyState();
      });
    });

    document.querySelectorAll('[data-rounds]').forEach((btn) => {
      btn.addEventListener('click', () => {
        if (this.mode === 'lobby' && !this.net.isHost) return;
        this.settings.totalRounds = Number(btn.dataset.rounds);
        this.updateSettingsUI();
        this.broadcastLobbyState();
      });
    });

    // Lobby Controls
    document.getElementById('btn-copy-code')?.addEventListener('click', () => {
      this.copyRoomInvite(false);
    });
    document.getElementById('btn-copy-link')?.addEventListener('click', () => {
      this.copyRoomInvite(true);
    });
    document.getElementById('btn-add-bot')?.addEventListener('click', () => {
      this.addBotPlayer();
    });
    document.getElementById('btn-open-tab-twin')?.addEventListener('click', () => {
      const url = `${window.location.origin}${window.location.pathname}?room=${this.net.roomCode}`;
      window.open(url, '_blank');
    });
    document.getElementById('btn-start-match')?.addEventListener('click', () => {
      if (this.net.isHost) {
        this.hostStartMatch();
      }
    });
    document.getElementById('btn-leave-lobby')?.addEventListener('click', () => {
      this.leaveToMenu();
    });

    // Manual WebRTC SDP Modal Controls
    document.getElementById('btn-sdp-offer')?.addEventListener('click', async () => {
      const offer = await this.net.createManualWebRTCOffer();
      const out = document.getElementById('sdp-token-text');
      if (out) {
        out.value = offer;
        navigator.clipboard?.writeText(offer).catch(() => {});
        this.showToast('WebRTC Offer-Ticket erstellt & kopiert!');
      }
    });
    document.getElementById('btn-sdp-accept')?.addEventListener('click', async () => {
      const inp = document.getElementById('sdp-token-text');
      if (!inp || !inp.value.trim()) return;
      try {
        const token = inp.value.trim();
        const parsed = JSON.parse(atob(token));
        if (parsed.type === 'offer') {
          const answer = await this.net.acceptManualWebRTCOffer(token);
          inp.value = answer;
          navigator.clipboard?.writeText(answer).catch(() => {});
          this.showToast('Antwort-Ticket erzeugt & kopiert! Sende es zurück an den Host.');
        } else if (parsed.type === 'answer') {
          await this.net.finalizeManualWebRTCAnswer(token);
          this.showToast('WebRTC P2P Direktverbindung hergestellt!');
        }
      } catch (e) {
        this.showToast('Ungültiges WebRTC-Ticket');
      }
    });

    // In-Game Controls
    document.getElementById('btn-rotate-piece')?.addEventListener('click', () => {
      this.rotateSelectedPiece();
    });
    document.getElementById('btn-flip-piece')?.addEventListener('click', () => {
      this.flipSelectedPiece();
    });
    document.getElementById('btn-remove-piece')?.addEventListener('click', () => {
      this.returnSelectedPieceToTray();
    });
    document.getElementById('btn-clear-board')?.addEventListener('click', () => {
      this.clearAllPiecesFromBoard();
    });
    document.getElementById('btn-hint-piece')?.addEventListener('click', () => {
      this.applyHintPiece();
    });
    document.getElementById('btn-sound-toggle')?.addEventListener('click', () => {
      sound.muted = !sound.muted;
      const btn = document.getElementById('btn-sound-toggle');
      if (btn) btn.textContent = sound.muted ? '🔇' : '🔊';
    });
    document.getElementById('btn-quit-game')?.addEventListener('click', () => {
      this.leaveToMenu();
    });

    // Round Summary & Match Over Buttons
    document.getElementById('btn-next-round')?.addEventListener('click', () => {
      if (this.isSolo || this.net.isHost) {
        this.triggerNextRound();
      }
    });
    document.getElementById('btn-rematch')?.addEventListener('click', () => {
      if (this.isSolo) {
        this.startSoloMode();
      } else if (this.net.isHost) {
        this.hostStartMatch();
      }
    });
    document.getElementById('btn-back-menu')?.addEventListener('click', () => {
      this.leaveToMenu();
    });

    // Global Pointer move/up for smooth Drag & Drop on Touch & Mouse
    window.addEventListener('pointermove', (e) => this.onGlobalPointerMove(e), { passive: false });
    window.addEventListener('pointerup', (e) => this.onGlobalPointerUp(e));
    window.addEventListener('pointercancel', (e) => this.onGlobalPointerUp(e));

    // Keyboard shortcuts for desktop testing (R = Rotate, F / Space = Flip, Esc = Remove)
    window.addEventListener('keydown', (e) => {
      if (this.mode !== 'game' || this.roundFinished) return;
      if (e.key === 'r' || e.key === 'R') {
        e.preventDefault();
        this.rotateSelectedPiece();
      } else if (e.key === 'f' || e.key === 'F' || e.key === ' ') {
        e.preventDefault();
        this.flipSelectedPiece();
      } else if (e.key === 'Backspace' || e.key === 'Escape') {
        this.returnSelectedPieceToTray();
      }
    });

    this.updateSettingsUI();
  }

  renderAvatarPicker() {
    const container = document.getElementById('avatar-picker');
    if (!container) return;
    container.innerHTML = '';
    for (const av of AVATARS) {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = `avatar-btn ${this.net.playerAvatar === av ? 'active' : ''}`;
      btn.textContent = av;
      btn.addEventListener('click', () => {
        this.net.setProfile(this.net.playerName, av);
        this.renderAvatarPicker();
        this.syncSelfInPlayers();
      });
      container.appendChild(btn);
    }
  }

  updateSettingsUI() {
    document.querySelectorAll('[data-difficulty]').forEach((btn) => {
      btn.classList.toggle('active', Number(btn.dataset.difficulty) === this.settings.difficulty);
    });
    document.querySelectorAll('[data-timelimit]').forEach((btn) => {
      btn.classList.toggle('active', Number(btn.dataset.timelimit) === this.settings.timeLimit);
    });
    document.querySelectorAll('[data-rounds]').forEach((btn) => {
      btn.classList.toggle('active', Number(btn.dataset.rounds) === this.settings.totalRounds);
    });
  }

  checkURLRoomInvite() {
    const params = new URLSearchParams(window.location.search);
    const roomParam = params.get('room');
    if (roomParam && roomParam.trim().length >= 3) {
      const cleanCode = roomParam.trim().toUpperCase();
      const input = document.getElementById('join-code-input');
      if (input) input.value = cleanCode;
      setTimeout(() => {
        this.joinOnlineRoom(cleanCode);
      }, 250);
    }
  }

  switchScreen(screenName) {
    this.mode = screenName;
    document.querySelectorAll('.screen').forEach((el) => {
      el.classList.toggle('active', el.id === `screen-${screenName}`);
    });
  }

  /* =========================================================================
   * SOLO & ONLINE LOBBY MANAGEMENT
   * ========================================================================= */

  resetPlayerEntry(info) {
    return {
      id: info.id,
      name: info.name,
      avatar: info.avatar || '🦁',
      isHost: Boolean(info.isHost),
      isBot: Boolean(info.isBot),
      score: info.score || 0,
      gems: info.gems || [],
      placedCount: 0,
      totalPieces: this.settings.difficulty,
      solvedTime: null,
      solvedRank: null
    };
  }

  syncSelfInPlayers() {
    const self = this.net.getSelfInfo();
    if (this.players.has(self.id)) {
      const existing = this.players.get(self.id);
      existing.name = self.name;
      existing.avatar = self.avatar;
      this.renderLobbyPlayers();
    }
  }

  startSoloMode() {
    this.isSolo = true;
    this.net.disconnect();
    this.players.clear();
    const self = this.net.getSelfInfo();
    self.isHost = true;
    this.players.set(self.id, this.resetPlayerEntry(self));

    this.settings.matchSeed = 'SOLO-' + Math.floor(10000 + Math.random() * 89999);
    this.currentRound = 1;
    this.startRound(1);
  }

  async createOnlineRoom() {
    this.isSolo = false;
    this.players.clear();
    const code = await this.net.createRoom();
    const self = this.net.getSelfInfo();
    this.players.set(self.id, this.resetPlayerEntry(self));

    document.getElementById('lobby-room-code').textContent = code;
    document.getElementById('btn-start-match').style.display = 'inline-flex';
    document.getElementById('btn-add-bot').style.display = 'inline-flex';
    document.getElementById('guest-waiting-msg').style.display = 'none';

    this.renderLobbyPlayers();
    this.switchScreen('lobby');
    this.showToast(`Raum ${code} erstellt! Teile den Code mit deinen Freunden.`);
  }

  async joinOnlineRoom(code) {
    this.isSolo = false;
    this.players.clear();
    const cleanCode = await this.net.joinRoom(code);
    const self = this.net.getSelfInfo();
    this.players.set(self.id, this.resetPlayerEntry(self));

    document.getElementById('lobby-room-code').textContent = cleanCode;
    document.getElementById('btn-start-match').style.display = 'none';
    document.getElementById('btn-add-bot').style.display = 'none';
    document.getElementById('guest-waiting-msg').style.display = 'block';

    this.renderLobbyPlayers();
    this.switchScreen('lobby');
    this.showToast(`Trete Raum ${cleanCode} bei...`);
  }

  addBotPlayer() {
    if (!this.net.isHost) return;
    const botNames = ['Tiki-Meister', 'Savannen-Fuchs', 'Zulu-Sprinter', 'Kilimandscharo'];
    const botAvatars = ['🐆', '🐒', '🦜', '🐊'];
    const idx = this.players.size % botNames.length;
    const botId = 'bot_' + Math.random().toString(36).slice(2, 7);
    this.players.set(botId, this.resetPlayerEntry({
      id: botId,
      name: `${botNames[idx]} (Bot)`,
      avatar: botAvatars[idx],
      isHost: false,
      isBot: true
    }));
    this.renderLobbyPlayers();
    this.broadcastLobbyState();
  }

  broadcastLobbyState() {
    if (!this.net.isHost || this.isSolo) return;
    this.net.sendPacket({
      type: 'LOBBY_SYNC',
      settings: this.settings,
      players: Array.from(this.players.values())
    });
  }

  renderLobbyPlayers() {
    const listEl = document.getElementById('lobby-player-list');
    if (!listEl) return;
    listEl.innerHTML = '';

    for (const p of this.players.values()) {
      const card = document.createElement('div');
      card.className = 'lobby-player-card';
      card.innerHTML = `
        <span class="lobby-avatar">${p.avatar}</span>
        <div class="lobby-player-info">
          <div class="lobby-player-name">${this.escapeHTML(p.name)} ${p.id === this.net.playerId ? '<span class="you-badge">DU</span>' : ''}</div>
          <div class="lobby-player-role">${p.isHost ? '👑 Raum-Host' : p.isBot ? '🤖 KI-Gegner' : '⚡ Bereit für Ubongo'}</div>
        </div>
      `;
      listEl.appendChild(card);
    }

    const countEl = document.getElementById('lobby-player-count');
    if (countEl) {
      countEl.textContent = `${this.players.size} Spieler in der Lobby`;
    }
  }

  onNetworkPacket(packet) {
    switch (packet.type) {
      case 'PLAYER_JOIN': {
        if (packet.player && packet.player.id) {
          if (!this.players.has(packet.player.id)) {
            this.players.set(packet.player.id, this.resetPlayerEntry(packet.player));
            this.showToast(`${packet.player.avatar} ${packet.player.name} ist beigetreten!`);
          }
          this.renderLobbyPlayers();
          if (this.net.isHost) {
            this.broadcastLobbyState();
          }
        }
        break;
      }

      case 'LOBBY_SYNC': {
        if (!this.net.isHost) {
          if (packet.settings) {
            this.settings = { ...this.settings, ...packet.settings };
            this.updateSettingsUI();
          }
          if (Array.isArray(packet.players)) {
            this.players.clear();
            for (const p of packet.players) {
              this.players.set(p.id, p);
            }
            // Ensure self is still present
            if (!this.players.has(this.net.playerId)) {
              this.players.set(this.net.playerId, this.resetPlayerEntry(this.net.getSelfInfo()));
            }
            this.renderLobbyPlayers();
          }
        }
        break;
      }

      case 'START_ROUND': {
        if (packet.settings) {
          this.settings = { ...this.settings, ...packet.settings };
        }
        if (Array.isArray(packet.players)) {
          this.players.clear();
          for (const p of packet.players) {
            this.players.set(p.id, p);
          }
        }
        this.startRound(packet.roundNumber || 1);
        break;
      }

      case 'PLAYER_PROGRESS': {
        const p = this.players.get(packet.playerId);
        if (p) {
          p.placedCount = packet.placedCount;
          p.totalPieces = packet.totalPieces;
          this.renderLiveOpponentsBar();
        }
        break;
      }

      case 'PLAYER_UBONGO': {
        this.recordPlayerSolved(packet.playerId, packet.solvedTime);
        break;
      }

      case 'ROUND_END_SYNC': {
        if (!this.net.isHost && !this.roundFinished) {
          this.finishRound();
        }
        break;
      }
    }
  }

  hostStartMatch() {
    this.settings.matchSeed = 'MATCH-' + Math.floor(100000 + Math.random() * 899999);
    for (const p of this.players.values()) {
      p.score = 0;
      p.gems = [];
    }
    this.currentRound = 1;
    this.net.sendPacket({
      type: 'START_ROUND',
      roundNumber: 1,
      settings: this.settings,
      players: Array.from(this.players.values())
    });
    this.startRound(1);
  }

  /* =========================================================================
   * CORE GAMEPLAY, HOURGLASS TIMER & PUZZLE BOARD
   * ========================================================================= */

  startRound(roundNumber) {
    this.stopTimers();
    this.currentRound = roundNumber;
    this.roundFinished = false;
    this.finishOrder = [];

    // Generate deterministic guaranteed-solvable puzzle for this round
    this.puzzle = generateUbongoPuzzle(
      this.settings.matchSeed,
      this.currentRound,
      this.settings.difficulty
    );

    // Reset round progress for all players
    for (const p of this.players.values()) {
      p.placedCount = 0;
      p.totalPieces = this.puzzle.pieces.length;
      p.solvedTime = null;
      p.solvedRank = null;
    }

    // Initialize local player's pieces
    this.pieceStates.clear();
    for (const piece of this.puzzle.pieces) {
      this.pieceStates.set(piece.id, {
        piece,
        rotation: piece.initialRotation || 0,
        flipped: Boolean(piece.initialFlipped),
        placed: false,
        gridX: null,
        gridY: null
      });
    }

    // Select first piece by default
    this.selectedPieceId = this.puzzle.pieces[0]?.id || null;

    // Show Hint button in Solo mode, hide or allow in casual mode
    const hintBtn = document.getElementById('btn-hint-piece');
    if (hintBtn) {
      hintBtn.style.display = this.isSolo ? 'inline-flex' : 'none';
    }

    this.switchScreen('game');
    this.updateRoundHeaderUI();
    this.renderBoard();
    this.renderPieceTray();
    this.renderLiveOpponentsBar();

    // Start Hourglass Timer
    this.timeLeft = this.settings.timeLimit;
    this.roundStartTime = performance.now();
    this.updateHourglassUI();

    this.timerInterval = setInterval(() => {
      const elapsedSec = Math.floor((performance.now() - this.roundStartTime) / 1000);
      this.timeLeft = Math.max(0, this.settings.timeLimit - elapsedSec);
      this.updateHourglassUI();

      if (this.timeLeft <= 10 && this.timeLeft > 0) {
        sound.tick(this.timeLeft <= 5);
      }

      if (this.timeLeft <= 0) {
        this.onHourglassExpired();
      }
    }, 250);

    // If Host has AI Bots, simulate their piece progress
    if (this.net.isHost || this.isSolo) {
      this.startBotSimulation();
    }
  }

  stopTimers() {
    if (this.timerInterval) {
      clearInterval(this.timerInterval);
      this.timerInterval = null;
    }
    if (this.botInterval) {
      clearInterval(this.botInterval);
      this.botInterval = null;
    }
  }

  startBotSimulation() {
    const bots = Array.from(this.players.values()).filter((p) => p.isBot);
    if (bots.length === 0) return;

    this.botInterval = setInterval(() => {
      if (this.roundFinished) return;
      for (const bot of bots) {
        if (bot.solvedTime !== null) continue;
        if (Math.random() < 0.28) {
          bot.placedCount = Math.min(bot.totalPieces, bot.placedCount + 1);
          this.net.sendPacket({
            type: 'PLAYER_PROGRESS',
            playerId: bot.id,
            placedCount: bot.placedCount,
            totalPieces: bot.totalPieces
          });
          this.renderLiveOpponentsBar();

          if (bot.placedCount >= bot.totalPieces) {
            const elapsed = ((performance.now() - this.roundStartTime) / 1000).toFixed(1);
            this.net.sendPacket({
              type: 'PLAYER_UBONGO',
              playerId: bot.id,
              solvedTime: Number(elapsed)
            });
            this.recordPlayerSolved(bot.id, Number(elapsed));
          }
        }
      }
    }, 2600);
  }

  updateRoundHeaderUI() {
    const roundBadge = document.getElementById('game-round-badge');
    if (roundBadge) {
      roundBadge.textContent = `Runde ${this.currentRound} / ${this.settings.totalRounds}`;
    }
  }

  updateHourglassUI() {
    const ratio = Math.max(0, Math.min(1, this.timeLeft / this.settings.timeLimit));
    const topSand = document.getElementById('hourglass-sand-top');
    const bottomSand = document.getElementById('hourglass-sand-bottom');
    const stream = document.getElementById('hourglass-stream');
    const timeText = document.getElementById('hourglass-time-text');
    const hgWrapper = document.getElementById('hourglass-wrapper');

    if (topSand) {
      // Scale top bulb sand height proportionally to remaining time
      topSand.setAttribute('transform', `translate(0, ${(1 - ratio) * 42}) scale(1, ${ratio})`);
    }
    if (bottomSand) {
      const fillRatio = 1 - ratio;
      bottomSand.setAttribute('transform', `translate(0, ${44 * (1 - fillRatio)}) scale(1, ${fillRatio})`);
    }
    if (stream) {
      stream.style.opacity = this.timeLeft > 0 && !this.roundFinished ? '1' : '0';
    }
    if (timeText) {
      timeText.textContent = `${this.timeLeft}s`;
    }
    if (hgWrapper) {
      hgWrapper.classList.toggle('urgent', this.timeLeft <= 10 && this.timeLeft > 0);
    }
  }

  renderLiveOpponentsBar() {
    const bar = document.getElementById('live-opponents-bar');
    if (!bar) return;
    bar.innerHTML = '';

    for (const p of this.players.values()) {
      const pct = p.totalPieces > 0 ? Math.round((p.placedCount / p.totalPieces) * 100) : 0;
      const chip = document.createElement('div');
      chip.className = `opponent-chip ${p.solvedTime !== null ? 'solved' : ''}`;
      chip.innerHTML = `
        <div class="opp-top">
          <span class="opp-avatar">${p.avatar}</span>
          <span class="opp-name">${this.escapeHTML(p.name)}</span>
          <span class="opp-score">💎 ${p.score}</span>
        </div>
        <div class="opp-progress-track">
          <div class="opp-progress-fill" style="width: ${pct}%"></div>
        </div>
        <div class="opp-status">
          ${
            p.solvedTime !== null
              ? `<span class="ubongo-call">🔥 UBONGO! (${p.solvedTime}s)</span>`
              : `${p.placedCount}/${p.totalPieces} Teile`
          }
        </div>
      `;
      bar.appendChild(chip);
    }
  }

  /* =========================================================================
   * TARGET BOARD & PIECE RENDERING + PLACEMENT LOGIC
   * ========================================================================= */

  getPlacedCellsMap(excludePieceId = null) {
    // Returns Map of "x,y" -> pieceState
    const cellMap = new Map();
    for (const st of this.pieceStates.values()) {
      if (!st.placed || st.piece.id === excludePieceId) continue;
      const coords = transformCoords(st.piece.coords, st.rotation, st.flipped);
      for (const [dx, dy] of coords) {
        cellMap.set(`${st.gridX + dx},${st.gridY + dy}`, st);
      }
    }
    return cellMap;
  }

  canPlacePieceAt(pieceId, gridX, gridY) {
    const st = this.pieceStates.get(pieceId);
    if (!st || !this.puzzle) return false;

    const targetSet = new Set(this.puzzle.targetCells.map(([x, y]) => `${x},${y}`));
    const occupiedMap = this.getPlacedCellsMap(pieceId);
    const coords = transformCoords(st.piece.coords, st.rotation, st.flipped);

    for (const [dx, dy] of coords) {
      const cx = gridX + dx;
      const cy = gridY + dy;
      const key = `${cx},${cy}`;
      if (!targetSet.has(key)) return false; // outside target silhouette
      if (occupiedMap.has(key)) return false; // overlaps another placed piece
    }
    return true;
  }

  renderBoard() {
    const boardEl = document.getElementById('ubongo-board');
    if (!boardEl || !this.puzzle) return;

    const { boardWidth, boardHeight, targetCells } = this.puzzle;
    const targetSet = new Set(targetCells.map(([x, y]) => `${x},${y}`));
    const occupiedMap = this.getPlacedCellsMap(this.dragState?.pieceId || null);

    // Compute ghost preview cells if currently dragging a piece over the board
    const ghostCells = new Set();
    let ghostValid = false;
    let ghostColor = '#ffffff';
    if (this.dragState && this.dragState.hoverGridX !== null && this.dragState.hoverGridY !== null) {
      const dragSt = this.pieceStates.get(this.dragState.pieceId);
      if (dragSt) {
        ghostColor = dragSt.piece.color;
        ghostValid = this.canPlacePieceAt(
          this.dragState.pieceId,
          this.dragState.hoverGridX,
          this.dragState.hoverGridY
        );
        const coords = transformCoords(dragSt.piece.coords, dragSt.rotation, dragSt.flipped);
        for (const [dx, dy] of coords) {
          ghostCells.add(`${this.dragState.hoverGridX + dx},${this.dragState.hoverGridY + dy}`);
        }
      }
    }

    // Dynamic cell sizing so board fits comfortably on mobile screens
    const maxDim = Math.max(boardWidth, boardHeight);
    const cellSize = maxDim <= 5 ? 52 : maxDim === 6 ? 46 : 40;
    boardEl.style.gridTemplateColumns = `repeat(${boardWidth}, ${cellSize}px)`;
    boardEl.style.gridTemplateRows = `repeat(${boardHeight}, ${cellSize}px)`;
    boardEl.innerHTML = '';

    for (let y = 0; y < boardHeight; y++) {
      for (let x = 0; x < boardWidth; x++) {
        const key = `${x},${y}`;
        const isTarget = targetSet.has(key);
        const placedSt = occupiedMap.get(key);
        const isGhost = ghostCells.has(key);

        const cell = document.createElement('div');
        cell.className = 'board-cell';
        cell.dataset.gx = x;
        cell.dataset.gy = y;

        if (!isTarget) {
          cell.classList.add('cell-outside');
        } else {
          cell.classList.add('cell-target');
        }

        if (placedSt) {
          cell.classList.add('cell-filled');
          cell.style.backgroundColor = placedSt.piece.color;
          cell.style.borderColor = placedSt.piece.border;
          if (this.selectedPieceId === placedSt.piece.id) {
            cell.classList.add('cell-selected-piece');
          }
          // Allow dragging an already placed piece directly from the board
          cell.addEventListener('pointerdown', (e) => {
            if (this.roundFinished) return;
            e.preventDefault();
            this.selectedPieceId = placedSt.piece.id;
            const grabOffsetX = x - placedSt.gridX;
            const grabOffsetY = y - placedSt.gridY;
            this.startDraggingPiece(placedSt.piece.id, e, grabOffsetX, grabOffsetY);
          });
        } else if (isTarget) {
          // Clicking an empty target cell attempts to place the selected piece centered/anchored there
          cell.addEventListener('click', () => {
            if (this.roundFinished || !this.selectedPieceId) return;
            this.tryTapPlaceOnBoard(this.selectedPieceId, x, y);
          });
        }

        if (isGhost) {
          cell.classList.add(ghostValid ? 'cell-ghost-valid' : 'cell-ghost-invalid');
          if (ghostValid) {
            cell.style.setProperty('--ghost-color', ghostColor);
          }
        }

        boardEl.appendChild(cell);
      }
    }
  }

  /**
   * Smart Tap-to-Place: If user taps cell (x,y) on the board, find an anchor offset of the selected piece
   * that places it cleanly covering (x,y) or anchored at (x,y).
   */
  tryTapPlaceOnBoard(pieceId, tapX, tapY) {
    const st = this.pieceStates.get(pieceId);
    if (!st) return;

    // First try anchoring top-left at (tapX, tapY)
    if (this.canPlacePieceAt(pieceId, tapX, tapY)) {
      this.placePieceOnBoard(pieceId, tapX, tapY);
      return;
    }

    // Otherwise try anchoring so one of the piece's own squares lands on (tapX, tapY)
    const coords = transformCoords(st.piece.coords, st.rotation, st.flipped);
    for (const [dx, dy] of coords) {
      const candidateX = tapX - dx;
      const candidateY = tapY - dy;
      if (this.canPlacePieceAt(pieceId, candidateX, candidateY)) {
        this.placePieceOnBoard(pieceId, candidateX, candidateY);
        return;
      }
    }

    sound.invalid();
  }

  placePieceOnBoard(pieceId, gridX, gridY) {
    const st = this.pieceStates.get(pieceId);
    if (!st) return;

    st.placed = true;
    st.gridX = gridX;
    st.gridY = gridY;
    sound.place();

    // Auto-select next unplaced piece for fast workflow
    const nextUnplaced = Array.from(this.pieceStates.values()).find((p) => !p.placed);
    if (nextUnplaced) {
      this.selectedPieceId = nextUnplaced.piece.id;
    }

    this.renderBoard();
    this.renderPieceTray();
    this.broadcastLocalProgress();
    this.checkIfPuzzleSolved();
  }

  renderPieceTray() {
    const trayEl = document.getElementById('piece-tray');
    if (!trayEl || !this.puzzle) return;
    trayEl.innerHTML = '';

    for (const st of this.pieceStates.values()) {
      const item = document.createElement('div');
      const isSelected = this.selectedPieceId === st.piece.id;
      item.className = `tray-piece-card ${isSelected ? 'selected' : ''} ${st.placed ? 'placed' : ''}`;

      const coords = transformCoords(st.piece.coords, st.rotation, st.flipped);
      const { width, height } = getBounds(coords);
      const coordSet = new Set(coords.map(([x, y]) => `${x},${y}`));

      const miniGrid = document.createElement('div');
      miniGrid.className = 'mini-piece-grid';
      const cellPx = 24;
      miniGrid.style.gridTemplateColumns = `repeat(${width}, ${cellPx}px)`;
      miniGrid.style.gridTemplateRows = `repeat(${height}, ${cellPx}px)`;

      for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
          const sq = document.createElement('div');
          if (coordSet.has(`${x},${y}`)) {
            sq.className = 'mini-sq filled';
            sq.style.backgroundColor = st.piece.color;
            sq.style.borderColor = st.piece.border;
            sq.dataset.px = x;
            sq.dataset.py = y;
          } else {
            sq.className = 'mini-sq empty';
          }
          miniGrid.appendChild(sq);
        }
      }

      const label = document.createElement('div');
      label.className = 'tray-piece-label';
      label.textContent = st.placed ? '✓ Liegt' : st.piece.name;

      item.appendChild(miniGrid);
      item.appendChild(label);

      // Pointerdown starts Drag & Drop OR selects the piece
      item.addEventListener('pointerdown', (e) => {
        if (this.roundFinished) return;
        e.preventDefault();

        const alreadySelected = this.selectedPieceId === st.piece.id;
        this.selectedPieceId = st.piece.id;

        // Determine which sub-square of the mini-grid was grabbed
        const targetSq = e.target.closest('[data-px]');
        const grabX = targetSq ? Number(targetSq.dataset.px) : Math.floor(width / 2);
        const grabY = targetSq ? Number(targetSq.dataset.py) : Math.floor(height / 2);

        this.startDraggingPiece(st.piece.id, e, grabX, grabY, alreadySelected);
      });

      trayEl.appendChild(item);
    }
  }

  /* =========================================================================
   * SMOOTH DRAG & DROP FLOATING PIECE CONTROLLER
   * ========================================================================= */

  startDraggingPiece(pieceId, pointerEvent, grabOffsetX = 0, grabOffsetY = 0, wasAlreadySelected = false) {
    const st = this.pieceStates.get(pieceId);
    if (!st) return;

    sound.pickup();
    this.dragState = {
      pieceId,
      pointerId: pointerEvent.pointerId,
      startX: pointerEvent.clientX,
      startY: pointerEvent.clientY,
      currentX: pointerEvent.clientX,
      currentY: pointerEvent.clientY,
      grabOffsetX,
      grabOffsetY,
      wasPlacedBeforeDrag: st.placed,
      prevGridX: st.gridX,
      prevGridY: st.gridY,
      wasAlreadySelected,
      movedSignificantly: false,
      hoverGridX: null,
      hoverGridY: null
    };

    // Temporarily lift piece if it was on the board
    if (st.placed) {
      st.placed = false;
      st.gridX = null;
      st.gridY = null;
      this.broadcastLocalProgress();
    }

    this.renderFloatingDragPiece();
    this.renderBoard();
    this.renderPieceTray();
  }

  renderFloatingDragPiece() {
    let floatEl = document.getElementById('floating-drag-piece');
    if (!this.dragState) {
      if (floatEl) floatEl.style.display = 'none';
      return;
    }

    if (!floatEl) {
      floatEl = document.createElement('div');
      floatEl.id = 'floating-drag-piece';
      document.body.appendChild(floatEl);
    }

    const st = this.pieceStates.get(this.dragState.pieceId);
    if (!st) return;

    const coords = transformCoords(st.piece.coords, st.rotation, st.flipped);
    const { width, height } = getBounds(coords);
    const coordSet = new Set(coords.map(([x, y]) => `${x},${y}`));

    const maxDim = Math.max(this.puzzle.boardWidth, this.puzzle.boardHeight);
    const cellSize = maxDim <= 5 ? 52 : maxDim === 6 ? 46 : 40;

    floatEl.style.display = 'grid';
    floatEl.style.gridTemplateColumns = `repeat(${width}, ${cellSize}px)`;
    floatEl.style.gridTemplateRows = `repeat(${height}, ${cellSize}px)`;
    floatEl.innerHTML = '';

    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const sq = document.createElement('div');
        if (coordSet.has(`${x},${y}`)) {
          sq.className = 'float-sq filled';
          sq.style.backgroundColor = st.piece.color;
          sq.style.borderColor = st.piece.border;
        } else {
          sq.className = 'float-sq empty';
        }
        floatEl.appendChild(sq);
      }
    }

    this.updateFloatingDragPosition();
  }

  updateFloatingDragPosition() {
    const floatEl = document.getElementById('floating-drag-piece');
    if (!floatEl || !this.dragState || !this.puzzle) return;

    const maxDim = Math.max(this.puzzle.boardWidth, this.puzzle.boardHeight);
    const cellSize = maxDim <= 5 ? 52 : maxDim === 6 ? 46 : 40;

    // Offset slightly upward on touch devices so finger doesn't hide the piece
    const touchLiftY = 28;
    const left = this.dragState.currentX - (this.dragState.grabOffsetX + 0.5) * cellSize;
    const top = this.dragState.currentY - (this.dragState.grabOffsetY + 0.5) * cellSize - touchLiftY;

    floatEl.style.transform = `translate3d(${left}px, ${top}px, 0)`;

    // Check which board cell is beneath the piece's top-left (0,0) square center
    const anchorScreenX = left + cellSize * 0.5;
    const anchorScreenY = top + cellSize * 0.5;

    const boardEl = document.getElementById('ubongo-board');
    if (boardEl) {
      const rect = boardEl.getBoundingClientRect();
      // Account for 10px board padding
      const relX = anchorScreenX - (rect.left + 10);
      const relY = anchorScreenY - (rect.top + 10);
      const step = cellSize + 4; // 4px grid gap
      const gx = Math.floor(relX / step);
      const gy = Math.floor(relY / step);

      if (gx >= -2 && gx <= this.puzzle.boardWidth + 1 && gy >= -2 && gy <= this.puzzle.boardHeight + 1) {
        if (this.dragState.hoverGridX !== gx || this.dragState.hoverGridY !== gy) {
          this.dragState.hoverGridX = gx;
          this.dragState.hoverGridY = gy;
          this.renderBoard();
        }
      } else if (this.dragState.hoverGridX !== null) {
        this.dragState.hoverGridX = null;
        this.dragState.hoverGridY = null;
        this.renderBoard();
      }
    }
  }

  onGlobalPointerMove(e) {
    if (!this.dragState || e.pointerId !== this.dragState.pointerId) return;
    e.preventDefault();

    const dist = Math.hypot(e.clientX - this.dragState.startX, e.clientY - this.dragState.startY);
    if (dist > 8) {
      this.dragState.movedSignificantly = true;
    }

    this.dragState.currentX = e.clientX;
    this.dragState.currentY = e.clientY;
    this.updateFloatingDragPosition();
  }

  onGlobalPointerUp(e) {
    if (!this.dragState || e.pointerId !== this.dragState.pointerId) return;

    const drag = this.dragState;
    this.dragState = null;
    this.renderFloatingDragPiece();

    if (drag.movedSignificantly && drag.hoverGridX !== null && drag.hoverGridY !== null) {
      if (this.canPlacePieceAt(drag.pieceId, drag.hoverGridX, drag.hoverGridY)) {
        this.placePieceOnBoard(drag.pieceId, drag.hoverGridX, drag.hoverGridY);
        return;
      } else {
        sound.invalid();
      }
    } else if (!drag.movedSignificantly) {
      // Quick tap without dragging: if tapped in tray and was already selected, rotate it!
      if (!drag.wasPlacedBeforeDrag && drag.wasAlreadySelected) {
        this.rotateSelectedPiece();
        return;
      }
    }

    this.renderBoard();
    this.renderPieceTray();
  }

  /* =========================================================================
   * PIECE TRANSFORMATION ACTIONS (ROTATE, FLIP, HINT, CLEAR)
   * ========================================================================= */

  rotateSelectedPiece() {
    if (!this.selectedPieceId || this.roundFinished) return;
    const st = this.pieceStates.get(this.selectedPieceId);
    if (!st) return;

    st.rotation = (st.rotation + 1) % 4;
    if (st.placed && !this.canPlacePieceAt(st.piece.id, st.gridX, st.gridY)) {
      st.placed = false;
      st.gridX = null;
      st.gridY = null;
    }
    sound.rotate();
    this.renderBoard();
    this.renderPieceTray();
    this.broadcastLocalProgress();
    this.checkIfPuzzleSolved();
  }

  flipSelectedPiece() {
    if (!this.selectedPieceId || this.roundFinished) return;
    const st = this.pieceStates.get(this.selectedPieceId);
    if (!st) return;

    st.flipped = !st.flipped;
    if (st.placed && !this.canPlacePieceAt(st.piece.id, st.gridX, st.gridY)) {
      st.placed = false;
      st.gridX = null;
      st.gridY = null;
    }
    sound.flip();
    this.renderBoard();
    this.renderPieceTray();
    this.broadcastLocalProgress();
    this.checkIfPuzzleSolved();
  }

  returnSelectedPieceToTray() {
    if (!this.selectedPieceId || this.roundFinished) return;
    const st = this.pieceStates.get(this.selectedPieceId);
    if (!st || !st.placed) return;

    st.placed = false;
    st.gridX = null;
    st.gridY = null;
    sound.pickup();
    this.renderBoard();
    this.renderPieceTray();
    this.broadcastLocalProgress();
  }

  clearAllPiecesFromBoard() {
    if (this.roundFinished) return;
    for (const st of this.pieceStates.values()) {
      st.placed = false;
      st.gridX = null;
      st.gridY = null;
    }
    sound.pickup();
    this.renderBoard();
    this.renderPieceTray();
    this.broadcastLocalProgress();
  }

  /**
   * Solo Mode Hint: Places one unplaced piece in its exact solved position & orientation!
   */
  applyHintPiece() {
    if (!this.puzzle || !this.puzzle.solution || this.roundFinished) return;

    // Find a piece that is not yet in its solved position
    for (const sol of this.puzzle.solution) {
      const st = this.pieceStates.get(sol.pieceId);
      if (!st) continue;
      const alreadyCorrect =
        st.placed &&
        st.gridX === sol.gridX &&
        st.gridY === sol.gridY &&
        st.rotation === sol.rotation &&
        st.flipped === sol.flipped;

      if (!alreadyCorrect) {
        // Remove any conflicting piece overlapping the hint target cells
        const solSet = new Set(sol.cells.map(([x, y]) => `${x},${y}`));
        for (const other of this.pieceStates.values()) {
          if (other.placed && other.piece.id !== sol.pieceId) {
            const otherCoords = transformCoords(other.piece.coords, other.rotation, other.flipped);
            const overlaps = otherCoords.some(([dx, dy]) => solSet.has(`${other.gridX + dx},${other.gridY + dy}`));
            if (overlaps) {
              other.placed = false;
              other.gridX = null;
              other.gridY = null;
            }
          }
        }

        st.rotation = sol.rotation;
        st.flipped = sol.flipped;
        this.placePieceOnBoard(sol.pieceId, sol.gridX, sol.gridY);
        this.showToast(`💡 Tipp: ${st.piece.name} platziert!`);
        return;
      }
    }
  }

  broadcastLocalProgress() {
    const placedCount = Array.from(this.pieceStates.values()).filter((s) => s.placed).length;
    const totalPieces = this.pieceStates.size;

    const self = this.players.get(this.net.playerId);
    if (self) {
      self.placedCount = placedCount;
      self.totalPieces = totalPieces;
    }
    this.renderLiveOpponentsBar();

    if (!this.isSolo) {
      this.net.sendPacket({
        type: 'PLAYER_PROGRESS',
        playerId: this.net.playerId,
        placedCount,
        totalPieces
      });
    }
  }

  /* =========================================================================
   * WIN CONDITION, GEM REWARDS & MULTI-ROUND SCORING
   * ========================================================================= */

  checkIfPuzzleSolved() {
    if (this.roundFinished || !this.puzzle) return;

    // Check if all pieces are placed and all target cells are covered
    for (const st of this.pieceStates.values()) {
      if (!st.placed) return;
    }

    const occupiedMap = this.getPlacedCellsMap(null);
    if (occupiedMap.size !== this.puzzle.targetCells.length) return;

    for (const [tx, ty] of this.puzzle.targetCells) {
      if (!occupiedMap.has(`${tx},${ty}`)) return;
    }

    // Local player solved the Ubongo puzzle!
    const solvedTime = Number(((performance.now() - this.roundStartTime) / 1000).toFixed(1));
    sound.ubongoFanfare();
    this.triggerConfettiBurst();

    if (!this.isSolo) {
      this.net.sendPacket({
        type: 'PLAYER_UBONGO',
        playerId: this.net.playerId,
        solvedTime
      });
    }

    this.recordPlayerSolved(this.net.playerId, solvedTime);
  }

  recordPlayerSolved(playerId, solvedTime) {
    const p = this.players.get(playerId);
    if (!p || p.solvedTime !== null) return;

    p.placedCount = p.totalPieces;
    p.solvedTime = solvedTime;
    this.finishOrder.push(playerId);
    const rank = this.finishOrder.length;
    p.solvedRank = rank;

    // Award Gem according to rank (1st = Rubin 4pt, 2nd = Saphir 3pt, 3rd = Smaragd 2pt, 4th+ = Bernstein 1pt)
    const gemTier = GEM_TIERS[Math.min(rank - 1, GEM_TIERS.length - 1)];
    p.score += gemTier.points;
    p.gems.push(gemTier);

    if (playerId === this.net.playerId) {
      this.showToast(`🎉 UBONGO! Platz ${rank} (${solvedTime}s) → +${gemTier.points} Pkt (${gemTier.name})`);
    } else {
      this.showToast(`🔥 ${p.avatar} ${p.name} ruft UBONGO! (${solvedTime}s)`);
    }

    this.renderLiveOpponentsBar();

    // Check if all players in the room have now solved the puzzle
    const allSolved = Array.from(this.players.values()).every((pl) => pl.solvedTime !== null);
    if (allSolved) {
      setTimeout(() => this.finishRound(), 900);
    }
  }

  onHourglassExpired() {
    if (this.roundFinished) return;
    sound.timeUp();
    this.showToast('⏳ Die Sanduhr ist abgelaufen!');
    this.finishRound();
  }

  finishRound() {
    if (this.roundFinished) return;
    this.roundFinished = true;
    this.stopTimers();

    if (this.net.isHost && !this.isSolo) {
      this.net.sendPacket({ type: 'ROUND_END_SYNC' });
    }

    if (this.currentRound >= this.settings.totalRounds) {
      this.renderMatchOverScreen();
      this.switchScreen('match_over');
    } else {
      this.renderRoundSummaryScreen();
      this.switchScreen('round_summary');
    }
  }

  renderRoundSummaryScreen() {
    const titleEl = document.getElementById('summary-round-title');
    if (titleEl) {
      titleEl.textContent = `Ergebnis Runde ${this.currentRound} von ${this.settings.totalRounds}`;
    }

    const tbody = document.getElementById('summary-standings-list');
    if (tbody) {
      tbody.innerHTML = '';
      const sorted = Array.from(this.players.values()).sort((a, b) => b.score - a.score);
      sorted.forEach((p, idx) => {
        const row = document.createElement('div');
        row.className = 'standing-row';
        const roundResult =
          p.solvedTime !== null
            ? `<span class="badge-solved">Platz ${p.solvedRank} (${p.solvedTime}s)</span>`
            : `<span class="badge-timeout">Zeit abgelaufen (${p.placedCount}/${p.totalPieces})</span>`;

        row.innerHTML = `
          <div class="st-rank">#${idx + 1}</div>
          <div class="st-avatar">${p.avatar}</div>
          <div class="st-info">
            <div class="st-name">${this.escapeHTML(p.name)}</div>
            <div class="st-sub">${roundResult}</div>
          </div>
          <div class="st-score">💎 ${p.score} Pkt</div>
        `;
        tbody.appendChild(row);
      });
    }

    const nextBtn = document.getElementById('btn-next-round');
    const waitNote = document.getElementById('summary-host-wait');
    if (this.isSolo || this.net.isHost) {
      if (nextBtn) nextBtn.style.display = 'inline-flex';
      if (waitNote) waitNote.style.display = 'none';
    } else {
      if (nextBtn) nextBtn.style.display = 'none';
      if (waitNote) waitNote.style.display = 'block';
    }
  }

  triggerNextRound() {
    const nextRound = this.currentRound + 1;
    if (!this.isSolo && this.net.isHost) {
      this.net.sendPacket({
        type: 'START_ROUND',
        roundNumber: nextRound,
        settings: this.settings,
        players: Array.from(this.players.values())
      });
    }
    this.startRound(nextRound);
  }

  renderMatchOverScreen() {
    sound.ubongoFanfare();
    this.triggerConfettiBurst();

    const sorted = Array.from(this.players.values()).sort((a, b) => b.score - a.score);
    const winner = sorted[0];

    const winnerBanner = document.getElementById('match-winner-banner');
    if (winnerBanner && winner) {
      winnerBanner.innerHTML = `
        <div class="winner-crown">👑 ${winner.avatar}</div>
        <h2>${this.escapeHTML(winner.name)} gewinnt!</h2>
        <p>${winner.score} Edelstein-Punkte nach ${this.settings.totalRounds} Runden</p>
      `;
    }

    const listEl = document.getElementById('match-final-list');
    if (listEl) {
      listEl.innerHTML = '';
      sorted.forEach((p, idx) => {
        const gemsHtml = p.gems.map((g) => `<span title="${g.name}">${g.icon === 'Emerald' ? '🟢' : g.icon}</span>`).join(' ');
        const row = document.createElement('div');
        row.className = 'standing-row';
        row.innerHTML = `
          <div class="st-rank">#${idx + 1}</div>
          <div class="st-avatar">${p.avatar}</div>
          <div class="st-info">
            <div class="st-name">${this.escapeHTML(p.name)}</div>
            <div class="st-sub">${gemsHtml || 'Keine Edelsteine'}</div>
          </div>
          <div class="st-score">💎 ${p.score} Pkt</div>
        `;
        listEl.appendChild(row);
      });
    }
  }

  leaveToMenu() {
    this.stopTimers();
    this.net.disconnect();
    this.switchScreen('menu');
  }

  /* =========================================================================
   * UI HELPERS (TOAST, CONFETTI, CLIPBOARD, ESCAPE)
   * ========================================================================= */

  copyRoomInvite(asFullLink = false) {
    if (!this.net.roomCode) return;
    const text = asFullLink
      ? `${window.location.origin}${window.location.pathname}?room=${this.net.roomCode}`
      : this.net.roomCode;

    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(() => {
        this.showToast(asFullLink ? 'Einladungs-Link kopiert!' : `Raum-Code ${this.net.roomCode} kopiert!`);
      }).catch(() => {
        this.showToast(`Code: ${text}`);
      });
    } else {
      this.showToast(`Code: ${text}`);
    }
  }

  updateNetworkStatusUI(statusText) {
    const el = document.getElementById('net-status-pill');
    if (el) el.textContent = statusText;
  }

  showToast(message) {
    const toast = document.getElementById('app-toast');
    if (!toast) return;
    toast.textContent = message;
    toast.classList.add('visible');
    clearTimeout(this.toastTimeout);
    this.toastTimeout = setTimeout(() => {
      toast.classList.remove('visible');
    }, 3000);
  }

  triggerConfettiBurst() {
    const container = document.getElementById('confetti-layer');
    if (!container) return;
    const colors = ['#ef4444', '#f59e0b', '#10b981', '#3b82f6', '#d946ef', '#fde047'];
    for (let i = 0; i < 36; i++) {
      const p = document.createElement('div');
      p.className = 'confetti-particle';
      p.style.left = `${15 + Math.random() * 70}%`;
      p.style.backgroundColor = colors[i % colors.length];
      p.style.setProperty('--dx', `${(Math.random() - 0.5) * 260}px`);
      p.style.setProperty('--dy', `${-120 - Math.random() * 220}px`);
      p.style.setProperty('--rot', `${Math.random() * 720}deg`);
      container.appendChild(p);
      setTimeout(() => p.remove(), 1200);
    }
  }

  escapeHTML(str) {
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }
}

function bootstrapUbongo() {
  if (!window.ubongoApp) {
    window.ubongoApp = new UbongoApp();
  }
  if ('serviceWorker' in navigator && window.location.protocol.startsWith('http')) {
    navigator.serviceWorker.register('./sw.js').catch(() => {});
  }
}

if (document.readyState === 'loading') {
  window.addEventListener('DOMContentLoaded', bootstrapUbongo);
} else {
  bootstrapUbongo();
}
