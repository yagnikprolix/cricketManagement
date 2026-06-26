"use client";

import { useState, useEffect, useRef, useCallback } from 'react';
import { Video, VideoOff, Camera, CameraOff, Mic, MicOff, Users, RefreshCw } from 'lucide-react';
import Button from '@/components/ui/Button';

const ICE_SERVERS = [
  { urls: 'stun:stun.l.google.com:19302' },
  { urls: 'stun:stun1.l.google.com:19302' },
];

export default function LiveVideoStreamer({ matchId }) {
  const [isStreaming, setIsStreaming] = useState(false);
  const [localStream, setLocalStream] = useState(null);
  const [viewerCount, setViewerCount] = useState(0);
  const [cameraFacing, setCameraFacing] = useState('environment'); // 'user' | 'environment'
  const [audioEnabled, setAudioEnabled] = useState(true);
  const [videoEnabled, setVideoEnabled] = useState(true);
  const [connectionState, setConnectionState] = useState('idle'); // idle | connecting | live | error
  const [errorMsg, setErrorMsg] = useState('');

  const localVideoRef = useRef(null);
  const wsRef = useRef(null);
  const peerConnectionsRef = useRef(new Map()); // viewerId -> RTCPeerConnection
  const streamRef = useRef(null);

  // Cleanup function
  const cleanup = useCallback(() => {
    // Close all peer connections
    peerConnectionsRef.current.forEach((pc) => {
      pc.close();
    });
    peerConnectionsRef.current.clear();

    // Close WebSocket
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }

    // Stop all media tracks
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }

    setLocalStream(null);
    setIsStreaming(false);
    setViewerCount(0);
    setConnectionState('idle');
  }, []);

  // Create peer connection for a specific viewer
  const createPeerConnection = useCallback((viewerId) => {
    if (!streamRef.current) return null;

    const pc = new RTCPeerConnection({ iceServers: ICE_SERVERS });

    // Add all local tracks to the peer connection
    streamRef.current.getTracks().forEach(track => {
      pc.addTrack(track, streamRef.current);
    });

    // Send ICE candidates to the viewer via signaling
    pc.onicecandidate = (event) => {
      if (event.candidate && wsRef.current?.readyState === 1) {
        wsRef.current.send(JSON.stringify({
          type: 'ice-candidate',
          candidate: event.candidate,
          viewerId,
        }));
      }
    };

    pc.onconnectionstatechange = () => {
      console.log(`[Streamer] Peer connection to ${viewerId}: ${pc.connectionState}`);
      if (pc.connectionState === 'failed' || pc.connectionState === 'disconnected') {
        pc.close();
        peerConnectionsRef.current.delete(viewerId);
      }
    };

    peerConnectionsRef.current.set(viewerId, pc);
    return pc;
  }, []);

  // Handle incoming signaling messages
  const handleSignalingMessage = useCallback(async (msg) => {
    if (msg.type === 'viewer-count') {
      setViewerCount(msg.count);
    } else if (msg.type === 'offer') {
      // A viewer sent us an offer — create answer
      const viewerId = msg.viewerId;
      let pc = peerConnectionsRef.current.get(viewerId);
      if (!pc) {
        pc = createPeerConnection(viewerId);
      }
      if (!pc) return;

      try {
        await pc.setRemoteDescription(new RTCSessionDescription(msg.offer));
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);

        if (wsRef.current?.readyState === 1) {
          wsRef.current.send(JSON.stringify({
            type: 'answer',
            answer: answer,
            viewerId,
          }));
        }
      } catch (err) {
        console.error('[Streamer] Error handling offer from viewer:', err);
      }
    } else if (msg.type === 'ice-candidate' && msg.from !== 'broadcaster') {
      // ICE candidate from a viewer
      const viewerId = msg.viewerId;
      const pc = peerConnectionsRef.current.get(viewerId);
      if (pc && msg.candidate) {
        try {
          await pc.addIceCandidate(new RTCIceCandidate(msg.candidate));
        } catch (err) {
          console.error('[Streamer] Error adding ICE candidate:', err);
        }
      }
    } else if (msg.type === 'viewer-disconnected') {
      const viewerId = msg.viewerId;
      const pc = peerConnectionsRef.current.get(viewerId);
      if (pc) {
        pc.close();
        peerConnectionsRef.current.delete(viewerId);
      }
    }
  }, [createPeerConnection]);

  // Start broadcasting
  const startBroadcast = async () => {
    setErrorMsg('');
    setConnectionState('connecting');

    try {
      // Request camera and microphone
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: cameraFacing,
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
        audio: true,
      });

      streamRef.current = stream;
      setLocalStream(stream);

      if (localVideoRef.current) {
        localVideoRef.current.srcObject = stream;
      }

      // Connect to signaling server
      const protocol = window.location.protocol === 'https:' ? 'wss' : 'ws';
      const wsUrl = `${protocol}://${window.location.host}/ws/live-video?matchId=${matchId}&role=broadcaster`;
      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onopen = () => {
        console.log('[Streamer] Connected to signaling server');
        setConnectionState('live');
        setIsStreaming(true);

        // Toggle the liveVideoActive flag
        fetch(`/api/matches/${matchId}/live-video`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ active: true }),
        }).catch(() => {});
      };

      ws.onmessage = (event) => {
        try {
          const msg = JSON.parse(event.data);
          handleSignalingMessage(msg);
        } catch (_) {}
      };

      ws.onerror = () => {
        setErrorMsg('WebSocket connection failed');
        setConnectionState('error');
      };

      ws.onclose = () => {
        if (connectionState !== 'idle') {
          console.log('[Streamer] Signaling connection closed');
        }
      };

    } catch (err) {
      console.error('[Streamer] Failed to start broadcast:', err);
      setErrorMsg(
        err.name === 'NotAllowedError'
          ? 'Camera permission denied. Please allow camera access in your browser settings.'
          : err.name === 'NotFoundError'
          ? 'No camera found. Please connect a camera and try again.'
          : `Failed to start broadcast: ${err.message}`
      );
      setConnectionState('error');
    }
  };

  // Stop broadcasting
  const stopBroadcast = async () => {
    // Toggle the liveVideoActive flag off
    try {
      await fetch(`/api/matches/${matchId}/live-video`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ active: false }),
      });
    } catch (_) {}

    cleanup();
  };

  // Toggle camera facing
  const switchCamera = async () => {
    if (!isStreaming) return;

    const newFacing = cameraFacing === 'user' ? 'environment' : 'user';
    setCameraFacing(newFacing);

    try {
      const newStream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: newFacing,
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
        audio: audioEnabled,
      });

      // Replace video track in all peer connections
      const newVideoTrack = newStream.getVideoTracks()[0];
      const oldVideoTrack = streamRef.current?.getVideoTracks()[0];

      peerConnectionsRef.current.forEach((pc) => {
        const sender = pc.getSenders().find(s => s.track?.kind === 'video');
        if (sender && newVideoTrack) {
          sender.replaceTrack(newVideoTrack);
        }
      });

      // Stop old video track
      if (oldVideoTrack) oldVideoTrack.stop();

      // Update local stream
      if (streamRef.current) {
        streamRef.current.removeTrack(oldVideoTrack);
        streamRef.current.addTrack(newVideoTrack);
      }

      if (localVideoRef.current) {
        localVideoRef.current.srcObject = streamRef.current;
      }

      // Also stop new audio track if audio exists (we keep the old audio track)
      const newAudioTrack = newStream.getAudioTracks()[0];
      if (newAudioTrack) newAudioTrack.stop();

    } catch (err) {
      console.error('[Streamer] Failed to switch camera:', err);
    }
  };

  // Toggle microphone
  const toggleMic = () => {
    if (streamRef.current) {
      streamRef.current.getAudioTracks().forEach(track => {
        track.enabled = !track.enabled;
      });
      setAudioEnabled(!audioEnabled);
    }
  };

  // Toggle video
  const toggleVideo = () => {
    if (streamRef.current) {
      streamRef.current.getVideoTracks().forEach(track => {
        track.enabled = !track.enabled;
      });
      setVideoEnabled(!videoEnabled);
    }
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      // On unmount, stop broadcast and toggle flag off
      if (streamRef.current) {
        fetch(`/api/matches/${matchId}/live-video`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ active: false }),
        }).catch(() => {});
      }
      cleanup();
    };
  }, [cleanup, matchId]);

  return (
    <div className="live-video-streamer">
      <div className="streamer-header">
        <div className="streamer-header-left">
          <Video size={20} className="text-[var(--primary)]" />
          <h3 className="streamer-title">Live Video Broadcast</h3>
        </div>
        {isStreaming && (
          <div className="streamer-badges">
            <span className="live-video-badge">
              <span className="live-dot" />
              LIVE
            </span>
            <span className="viewer-badge">
              <Users size={13} />
              {viewerCount}
            </span>
          </div>
        )}
      </div>

      {/* Video Preview */}
      <div className="video-preview-container">
        <video
          ref={localVideoRef}
          autoPlay
          playsInline
          muted
          className={`video-preview ${isStreaming ? 'video-live' : ''}`}
        />
        {!isStreaming && connectionState !== 'connecting' && (
          <div className="video-placeholder">
            <Camera size={48} className="text-[var(--on-surface-variant)]" style={{ opacity: 0.4 }} />
            <p className="video-placeholder-text">Camera preview will appear here</p>
          </div>
        )}
        {connectionState === 'connecting' && (
          <div className="video-placeholder">
            <RefreshCw size={32} className="text-[var(--primary)] animate-spin" />
            <p className="video-placeholder-text">Accessing camera...</p>
          </div>
        )}
      </div>

      {/* Error Message */}
      {errorMsg && (
        <div className="streamer-error">
          <p>{errorMsg}</p>
        </div>
      )}

      {/* Controls */}
      <div className="streamer-controls">
        {!isStreaming ? (
          <Button
            variant="filled"
            onClick={startBroadcast}
            disabled={connectionState === 'connecting'}
            full
          >
            <Video size={18} style={{ marginRight: '8px' }} />
            {connectionState === 'connecting' ? 'Starting Camera...' : 'Go Live — Start Broadcasting'}
          </Button>
        ) : (
          <>
            <div className="control-buttons-row">
              <button onClick={toggleMic} className={`control-btn ${!audioEnabled ? 'control-btn-off' : ''}`} title={audioEnabled ? 'Mute' : 'Unmute'}>
                {audioEnabled ? <Mic size={20} /> : <MicOff size={20} />}
              </button>
              <button onClick={toggleVideo} className={`control-btn ${!videoEnabled ? 'control-btn-off' : ''}`} title={videoEnabled ? 'Hide Video' : 'Show Video'}>
                {videoEnabled ? <Camera size={20} /> : <CameraOff size={20} />}
              </button>
              <button onClick={switchCamera} className="control-btn" title="Switch Camera">
                <RefreshCw size={20} />
              </button>
            </div>
            <Button
              variant="filled"
              onClick={stopBroadcast}
              full
              className="!bg-[var(--error)] !text-[var(--on-error)] hover:!opacity-90"
            >
              <VideoOff size={18} style={{ marginRight: '8px' }} />
              Stop Broadcasting
            </Button>
          </>
        )}
      </div>
    </div>
  );
}
