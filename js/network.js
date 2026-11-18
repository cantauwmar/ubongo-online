/**
 * WebRTC Peer-to-Peer Multiplayer Network Layer for Ubongo! Online
 * Supports:
 * 1. Direct Room Codes & Shareable Invite Links via WebRTC DataChannels (PeerJS + Google STUN)
 * 2. Instant Local Multi-Tab / Same-Device P2P via BroadcastChannel (automatic parallel bridge)
 * 3. Serverless Native WebRTC Offer/Answer Ticket Exchange (fallback when offline/firewalled)
 */

const PEER_PREFIX = 'ubongo-p2p-v1-';

export class UbongoNetwork {
  constructor(callbacks = {}) {
    this.callbacks = callbacks;
    this.playerId = 'p_' + Math.random().toString(36).substring(2, 9);
    this.playerName = localStorage.getItem('ubongo_player_name') || 'Spieler ' + Math.floor(10 + Math.random() * 89);
    this.playerAvatar = localStorage.getItem('ubongo_player_avatar') || '🦁';
    this.isHost = false;
    this.roomCode = null;

    // WebRTC PeerJS instance & active DataConnections
    this.peer = null;
    this.connections = new Map(); // peerId -> DataConnection

    // Native RTCPeerConnection for manual SDP ticket mode
    this.manualPc = null;
    this.manualDc = null;

    // BroadcastChannel for zero-latency local tab testing & hybrid bridging
    this.bc = null;
    this.seenMessageIds = new Set();
  }

  setProfile(name, avatar) {
    if (name && name.trim()) {
      this.playerName = name.trim().slice(0, 18);
      localStorage.setItem('ubongo_player_name', this.playerName);
    }
    if (avatar) {
      this.playerAvatar = avatar;
      localStorage.setItem('ubongo_player_avatar', this.playerAvatar);
    }
  }

  generateRoomCode() {
    const chars = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';
    let code = '';
    for (let i = 0; i < 4; i++) {
      code += chars[Math.floor(Math.random() * chars.length)];
    }
    return code;
  }

  setupBroadcastChannel(roomCode) {
    if (this.bc) {
      this.bc.close();
    }
    if (typeof BroadcastChannel !== 'undefined') {
      this.bc = new BroadcastChannel(`ubongo_room_${roomCode}`);
      this.bc.onmessage = (ev) => {
        if (ev.data && ev.data.senderId !== this.playerId) {
          this.handleIncomingPacket(ev.data);
        }
      };
    }
  }

  /**
   * Create a new P2P room as Host.
   */
  async createRoom(customCode = null) {
    this.disconnect();
    this.isHost = true;
    this.roomCode = (customCode || this.generateRoomCode()).toUpperCase();
    this.setupBroadcastChannel(this.roomCode);

    // Initialize WebRTC PeerJS host node if PeerJS is loaded
    if (typeof window.Peer !== 'undefined') {
      try {
        const peerId = `${PEER_PREFIX}${this.roomCode}`;
        this.peer = new window.Peer(peerId, {
          config: {
            iceServers: [
              { urls: 'stun:stun.l.google.com:19302' },
              { urls: 'stun:stun1.l.google.com:19302' }
            ]
          }
        });

        this.peer.on('open', () => {
          this.emitStatus('Verbunden (WebRTC P2P bereit)');
        });

        this.peer.on('connection', (conn) => {
          this.registerPeerConnection(conn);
        });

        this.peer.on('error', (err) => {
          console.warn('PeerJS warning:', err.type || err);
          if (err.type === 'unavailable-id') {
            // Room code collision, generate a new one
            this.createRoom(this.generateRoomCode());
          } else {
            this.emitStatus('Lokaler P2P-Modus & Direkt-WebRTC aktiv');
          }
        });
      } catch (e) {
        console.warn('WebRTC Peer init fallback:', e);
      }
    }

    return this.roomCode;
  }

  /**
   * Join an existing P2P room as Guest by 4-char Room Code.
   */
  async joinRoom(roomCode) {
    this.disconnect();
    this.isHost = false;
    this.roomCode = roomCode.trim().toUpperCase();
    this.setupBroadcastChannel(this.roomCode);

    // Immediately announce join via BroadcastChannel (works instantly if host is on same network/browser)
    this.sendPacket({
      type: 'PLAYER_JOIN',
      player: this.getSelfInfo()
    });

    // Also connect via WebRTC PeerJS across the internet
    if (typeof window.Peer !== 'undefined') {
      try {
        this.peer = new window.Peer({
          config: {
            iceServers: [
              { urls: 'stun:stun.l.google.com:19302' },
              { urls: 'stun:stun1.l.google.com:19302' }
            ]
          }
        });

        this.peer.on('open', () => {
          const hostPeerId = `${PEER_PREFIX}${this.roomCode}`;
          const conn = this.peer.connect(hostPeerId, { reliable: true });
          this.registerPeerConnection(conn);
        });

        this.peer.on('error', (err) => {
          console.warn('PeerJS guest warning:', err);
        });
      } catch (e) {
        console.warn('PeerJS join error:', e);
      }
    }

    return this.roomCode;
  }

  registerPeerConnection(conn) {
    conn.on('open', () => {
      this.connections.set(conn.peer, conn);
      this.emitStatus('WebRTC-Direktverbindung aktiv');
      // Send initial handshake
      conn.send(this.wrapPacket({
        type: 'PLAYER_JOIN',
        player: this.getSelfInfo()
      }));
    });

    conn.on('data', (data) => {
      this.handleIncomingPacket(data, conn);
    });

    conn.on('close', () => {
      this.connections.delete(conn.peer);
    });
  }

  /**
   * Native Serverless WebRTC Offer/Answer generator (for manual copy/paste P2P without signaling server)
   */
  async createManualWebRTCOffer() {
    this.manualPc = new RTCPeerConnection({
      iceServers: [{ urls: 'stun:stun.l.google.com:19302' }]
    });
    this.manualDc = this.manualPc.createDataChannel('ubongo-p2p');
    this.setupManualDataChannel(this.manualDc);

    const offer = await this.manualPc.createOffer();
    await this.manualPc.setLocalDescription(offer);
    await this.waitForIceGathering(this.manualPc);
    return btoa(JSON.stringify(this.manualPc.localDescription));
  }

  async acceptManualWebRTCOffer(offerToken) {
    const desc = JSON.parse(atob(offerToken.trim()));
    this.manualPc = new RTCPeerConnection({
      iceServers: [{ urls: 'stun:stun.l.google.com:19302' }]
    });
    this.manualPc.ondatachannel = (ev) => {
      this.manualDc = ev.channel;
      this.setupManualDataChannel(this.manualDc);
    };
    await this.manualPc.setRemoteDescription(desc);
    const answer = await this.manualPc.createAnswer();
    await this.manualPc.setLocalDescription(answer);
    await this.waitForIceGathering(this.manualPc);
    return btoa(JSON.stringify(this.manualPc.localDescription));
  }

  async finalizeManualWebRTCAnswer(answerToken) {
    if (!this.manualPc) return;
    const desc = JSON.parse(atob(answerToken.trim()));
    await this.manualPc.setRemoteDescription(desc);
  }

  setupManualDataChannel(dc) {
    dc.onopen = () => {
      this.emitStatus('Direktes WebRTC-DataChannel verbunden!');
      this.sendPacket({
        type: 'PLAYER_JOIN',
        player: this.getSelfInfo()
      });
    };
    dc.onmessage = (ev) => {
      try {
        const packet = JSON.parse(ev.data);
        this.handleIncomingPacket(packet);
      } catch (_) {}
    };
  }

  waitForIceGathering(pc) {
    return new Promise((resolve) => {
      if (pc.iceGatheringState === 'complete') {
        resolve();
        return;
      }
      const timeout = setTimeout(resolve, 2000);
      pc.onicegatheringstatechange = () => {
        if (pc.iceGatheringState === 'complete') {
          clearTimeout(timeout);
          resolve();
        }
      };
    });
  }

  wrapPacket(payload) {
    const msgId = `${this.playerId}_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
    this.seenMessageIds.add(msgId);
    return {
      ...payload,
      msgId,
      senderId: this.playerId,
      roomCode: this.roomCode,
      timestamp: Date.now()
    };
  }

  sendPacket(payload) {
    const packet = payload.msgId ? payload : this.wrapPacket(payload);

    // Send over WebRTC PeerJS connections
    for (const conn of this.connections.values()) {
      if (conn.open) {
        try {
          conn.send(packet);
        } catch (_) {}
      }
    }

    // Send over Manual RTCPeerConnection DataChannel if active
    if (this.manualDc && this.manualDc.readyState === 'open') {
      try {
        this.manualDc.send(JSON.stringify(packet));
      } catch (_) {}
    }

    // Send over BroadcastChannel for same-device / local tabs
    if (this.bc) {
      try {
        this.bc.postMessage(packet);
      } catch (_) {}
    }
  }

  handleIncomingPacket(packet, sourceConn = null) {
    if (!packet || !packet.msgId) return;
    if (this.seenMessageIds.has(packet.msgId)) return;
    this.seenMessageIds.add(packet.msgId);

    // If Host receives a packet from one Guest over WebRTC, relay it to all other Guests
    if (this.isHost && this.connections.size > 1) {
      for (const conn of this.connections.values()) {
        if (conn !== sourceConn && conn.open) {
          try {
            conn.send(packet);
          } catch (_) {}
        }
      }
    }

    if (this.callbacks.onPacket) {
      this.callbacks.onPacket(packet);
    }
  }

  getSelfInfo() {
    return {
      id: this.playerId,
      name: this.playerName,
      avatar: this.playerAvatar,
      isHost: this.isHost
    };
  }

  emitStatus(statusText) {
    if (this.callbacks.onStatus) {
      this.callbacks.onStatus(statusText);
    }
  }

  disconnect() {
    for (const conn of this.connections.values()) {
      try { conn.close(); } catch (_) {}
    }
    this.connections.clear();
    if (this.peer) {
      try { this.peer.destroy(); } catch (_) {}
      this.peer = null;
    }
    if (this.manualPc) {
      try { this.manualPc.close(); } catch (_) {}
      this.manualPc = null;
      this.manualDc = null;
    }
    if (this.bc) {
      try { this.bc.close(); } catch (_) {}
      this.bc = null;
    }
  }
}
