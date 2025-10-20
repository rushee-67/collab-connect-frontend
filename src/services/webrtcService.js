// src/services/webrtcService.js
import io from 'socket.io-client';

class WebRTCService {
  constructor(serverUrl) {
    this.serverUrl = serverUrl;
    this.socket = null;
    this.peers = new Map();
    this.localStream = null;
    this.eventListeners = new Map();
    this.currentRoomId = null;
    this.currentUserId = null;
    this.iceServers = {
      iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' }
        // Add TURN servers here for production
      ]
    };
  }

  // Simple event emitter
  on(eventName, callback) {
    if (!this.eventListeners.has(eventName)) {
      this.eventListeners.set(eventName, new Set());
    }
    this.eventListeners.get(eventName).add(callback);
  }

  emit(eventName, data) {
    if (this.eventListeners.has(eventName)) {
      this.eventListeners.get(eventName).forEach(callback => callback(data));
    }
  }

  // Connect to the Socket.IO server
  connect() {
    return new Promise((resolve, reject) => {
      // Allow server URL from environment; fallback to localhost
      const url = this.serverUrl || 'http://localhost:5000';

      // More robust options for deployed apps (retry, timeout)
      this.socket = io(url, {
        transports: ['websocket', 'polling'],
        reconnection: true,
        reconnectionAttempts: 10,
        timeout: 20000,
      });

      this.socket.on('connect', () => {
        console.log('Socket connected:', this.socket.id);
        this.setupSocketListeners();
        resolve();
      });

      this.socket.on('connect_error', (error) => {
        console.error('Socket connection error:', error);
        reject(error);
      });

      this.socket.on('disconnect', (reason) => {
        console.log('Socket disconnected:', reason);
      });
    });
  }

  setupSocketListeners() {
    // avoid re-registering if already set
    if (!this.socket) return;

    this.socket.on('existing-users', (users) => {
      console.log('Existing users in room:', users);
      users.forEach(user => {
        this.createPeerConnection(user.userId, true);
        this.emit('user-joined', { userId: user.userId, userName: user.userName });
      });
    });

    this.socket.on('user-connected', (userInfo) => {
      console.log('New user connected:', userInfo);
      this.createPeerConnection(userInfo.userId, false);
      this.emit('user-joined', { userId: userInfo.userId, userName: userInfo.userName });
    });

    this.socket.on('user-disconnected', (userId) => {
      console.log('User disconnected:', userId);
      this.removePeerConnection(userId);
      this.emit('user-left', { userId });
    });

    this.socket.on('offer', async (data) => {
      console.log('Received offer from:', data.caller);
      await this.handleOffer(data.offer, data.caller);
    });

    this.socket.on('answer', async (data) => {
      console.log('Received answer from:', data.answerer);
      await this.handleAnswer(data.answer, data.answerer);
    });

    this.socket.on('ice-candidate', async (data) => {
      console.log('Received ICE candidate from:', data.from);
      await this.handleICECandidate(data.candidate, data.from);
    });

    // IMPORTANT: backend now emits the full message object as data
    // so we pass it directly to frontend listeners
    this.socket.on('chat-message', (data) => {
      // data = { id, sender, message, timestamp }
      this.emit('receive-message', data);
    });

    this.socket.on('screen-share-started', (userId) => {
      this.emit('screen-share-started', { userId });
    });

    this.socket.on('screen-share-stopped', (userId) => {
      this.emit('screen-share-stopped', { userId });
    });

    this.socket.on('toggle-audio', ({ userId, enabled }) => {
      this.emit('toggle-audio', { userId, enabled });
    });

    this.socket.on('toggle-video', ({ userId, enabled }) => {
      this.emit('toggle-video', { userId, enabled });
    });
  }

  async getUserMedia(options) {
    this.localStream = await navigator.mediaDevices.getUserMedia(options);
    return this.localStream;
  }

  async joinRoom(roomId, userInfo) {
    if (!this.socket || !this.socket.connected) {
      throw new Error('Socket not connected. Call connect() first.');
    }

    console.log(`Attempting to join room ${roomId} as ${userInfo.userId}`);
    this.currentRoomId = roomId;
    this.currentUserId = userInfo.userId;
    this.socket.emit('join-room', roomId, userInfo);
  }

  async createPeerConnection(userId, isInitiator) {
    console.log(`Creating peer connection with ${userId}, initiator: ${isInitiator}`);

    const peerConnection = new RTCPeerConnection(this.iceServers);

    // Add local stream tracks
    if (this.localStream) {
      this.localStream.getTracks().forEach(track => {
        peerConnection.addTrack(track, this.localStream);
      });
    }

    // Handle incoming remote stream
    peerConnection.ontrack = (event) => {
      console.log('Received remote stream from:', userId);
      const remoteStream = event.streams[0];
      // Emit stream for UI
      this.emit('stream-added', { userId, stream: remoteStream });

      // Force-play audio to avoid autoplay blocking on some browsers
      try {
        const audioEl = document.createElement('audio');
        audioEl.autoplay = true;
        audioEl.srcObject = remoteStream;
        // keep element detached from DOM; browser will still attempt to autoplay once user interacts
      } catch (err) {
        console.warn('Auto-play audio setup failed', err);
      }
    };

    peerConnection.onicecandidate = (event) => {
      if (event.candidate) {
        this.socket.emit('ice-candidate', {
          candidate: event.candidate,
          target: userId,
          from: this.currentUserId
        });
      }
    };

    peerConnection.onconnectionstatechange = () => {
      console.log(`Connection state with ${userId}:`, peerConnection.connectionState);
      if (peerConnection.connectionState === 'failed') {
        this.emit('error', { message: `Connection failed with user ${userId}` });
      }
    };

    this.peers.set(userId, peerConnection);

    if (isInitiator) {
      await this.createOffer(userId);
    }
  }

  async createOffer(targetUserId) {
    const peerConnection = this.peers.get(targetUserId);
    if (!peerConnection) return;

    try {
      const offer = await peerConnection.createOffer();
      await peerConnection.setLocalDescription(offer);

      this.socket.emit('offer', {
        offer,
        target: targetUserId,
        caller: this.currentUserId
      });
    } catch (error) {
      console.error('Failed to create offer:', error);
      this.emit('error', { message: 'Failed to create offer' });
    }
  }

  async handleOffer(offer, callerId) {
    if (!this.peers.has(callerId)) {
      await this.createPeerConnection(callerId, false);
    }

    const peerConnection = this.peers.get(callerId);
    if (!peerConnection) return;

    try {
      await peerConnection.setRemoteDescription(new RTCSessionDescription(offer));
      const answer = await peerConnection.createAnswer();
      await peerConnection.setLocalDescription(answer);

      this.socket.emit('answer', {
        answer,
        target: callerId,
        answerer: this.currentUserId
      });
    } catch (error) {
      console.error('Failed to handle offer:', error);
      this.emit('error', { message: 'Failed to handle offer' });
    }
  }

  async handleAnswer(answer, answererId) {
    const peerConnection = this.peers.get(answererId);
    if (!peerConnection) return;

    try {
      await peerConnection.setRemoteDescription(new RTCSessionDescription(answer));
    } catch (error) {
      console.error('Failed to handle answer:', error);
      this.emit('error', { message: 'Failed to handle answer' });
    }
  }

  async handleICECandidate(candidate, fromUserId) {
    const peerConnection = this.peers.get(fromUserId);
    if (!peerConnection) {
      console.warn(`No peer connection found for ${fromUserId}`);
      return;
    }

    try {
      await peerConnection.addIceCandidate(new RTCIceCandidate(candidate));
    } catch (error) {
      console.warn('Failed to add ICE candidate:', error);
    }
  }

  removePeerConnection(userId) {
    const peerConnection = this.peers.get(userId);
    if (peerConnection) {
      peerConnection.close();
      this.peers.delete(userId);
    }
  }

  // Replace the video track in all peer connections (used for screen share)
  replaceVideoTrack(newTrack) {
    this.peers.forEach(peer => {
      try {
        const sender = peer.getSenders().find(s => s.track && s.track.kind === 'video');
        if (sender) {
          sender.replaceTrack(newTrack);
        }
      } catch (err) {
        console.warn('replaceTrack error:', err);
      }
    });
  }

  leaveRoom() {
    this.peers.forEach((peerConnection) => {
      try { peerConnection.close(); } catch (e) {}
    });
    this.peers.clear();

    if (this.localStream) {
      try {
        this.localStream.getTracks().forEach(track => track.stop());
      } catch (e) {}
      this.localStream = null;
    }

    if (this.socket && this.currentRoomId) {
      this.socket.emit('leave-room', this.currentRoomId);
    }
  }

  disconnect() {
    if (this.socket) {
      try { this.socket.disconnect(); } catch (e) {}
      this.socket = null;
    }
  }
}

export default WebRTCService;
