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
  // In webrtcService.js - Update the connect method
connect() {
  return new Promise((resolve, reject) => {
    this.socket = io(this.serverUrl);
    
    this.socket.on('connect', () => {
      console.log('Socket connected:', this.socket.id);
      this.setupSocketListeners();
      resolve();  // Resolve when connected
    });
    
    this.socket.on('connect_error', (error) => {
      console.error('Socket connection error:', error);
      reject(error);
    });
  });
}


  // Set up all Socket.IO event listeners
  setupSocketListeners() {
    this.socket.on('connect', () => {
      console.log('Socket connected:', this.socket.id);
    });

    // Handle existing users in the room
    this.socket.on('existing-users', (users) => {
      console.log('Existing users in room:', users);
      users.forEach(user => {
        this.createPeerConnection(user.userId, true);
        this.emit('user-joined', { 
          userId: user.userId, 
          userName: user.userName 
        });
      });
    });

    // Handle new user connecting
    this.socket.on('user-connected', (userInfo) => {
      console.log('New user connected:', userInfo);
      this.createPeerConnection(userInfo.userId, false);
      this.emit('user-joined', { 
        userId: userInfo.userId, 
        userName: userInfo.userName 
      });
    });

    // Handle user disconnecting
    this.socket.on('user-disconnected', (userId) => {
      console.log('User disconnected:', userId);
      this.removePeerConnection(userId);
      this.emit('user-left', { userId });
    });

    // Handle WebRTC signaling
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

    // Chat messages
    this.socket.on('chat-message', (data) => {
      this.emit('receive-message', data.message);
    });

    // Screen sharing events
    this.socket.on('screen-share-started', (userId) => {
      this.emit('screen-share-started', { userId });
    });

    this.socket.on('screen-share-stopped', (userId) => {
      this.emit('screen-share-stopped', { userId });
    });

    // Toggle events
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

  // In webrtcService.js - Update joinRoom method
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
      this.emit('stream-added', { userId, stream: event.streams[0] });
    };

    // Handle ICE candidates
    peerConnection.onicecandidate = (event) => {
      if (event.candidate) {
        this.socket.emit('ice-candidate', {
          candidate: event.candidate,
          target: userId,
          from: this.currentUserId
        });
      }
    };

    // Handle connection state changes
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

  replaceVideoTrack(newTrack) {
    this.peers.forEach(peer => {
      const sender = peer.getSenders().find(s => s.track && s.track.kind === 'video');
      if (sender) {
        sender.replaceTrack(newTrack);
      }
    });
  }

  leaveRoom() {
    this.peers.forEach((peerConnection) => {
      peerConnection.close();
    });
    this.peers.clear();

    if (this.localStream) {
      this.localStream.getTracks().forEach(track => track.stop());
      this.localStream = null;
    }

    if (this.socket && this.currentRoomId) {
      this.socket.emit('leave-room', this.currentRoomId);
    }
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
  }
}

export default WebRTCService;
