"use client";

import { useState, useEffect, useRef, useCallback } from 'react';
import { Video, VideoOff, Volume2, VolumeX, Maximize, Minimize, Radio } from 'lucide-react';

const ICE_SERVERS = [
  { urls: 'stun:stun.l.google.com:19302' },
  { urls: 'stun:stun1.l.google.com:19302' },
];

export default function LiveVideoViewer({ matchId, isVideoActive }) {
  const [viewState, setViewState] = useState('idle'); // idle | connecting | live | ended | error
  const [isMuted, setIsMuted] = useState(true); // Start muted for autoplay policy
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [viewerId, setViewerId] = useState(null);

  const videoRef = useRef(null);
  const containerRef = useRef(null);
  const wsRef = useRef(null);
  const pcRef = useRef(null);
  const reconnectTimerRef = useRef(null);

  const cleanup = useCallback(() => {
    if (reconnectTimerRef.current) {
      clearTimeout(reconnectTimerRef.current);
      reconnectTimerRef.current = null;
    }

    if (pcRef.current) {
      pcRef.current.close();
      pcRef.current = null;
    }

    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }

    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
  }, []);

  // Create peer connection and send offer to broadcaster
  const createPeerAndOffer = useCallback(async () => {
    if (pcRef.current) {
      pcRef.current.close();
    }

    const pc = new RTCPeerConnection({ iceServers: ICE_SERVERS });
    pcRef.current = pc;

    // We need a transceiver to receive video/audio
    pc.addTransceiver('video', { direction: 'recvonly' });
    pc.addTransceiver('audio', { direction: 'recvonly' });

    pc.ontrack = (event) => {
      console.log('[Viewer] Received remote track:', event.track.kind);
      if (videoRef.current && event.streams[0]) {
        videoRef.current.srcObject = event.streams[0];
        setViewState('live');
      }
    };

    pc.onicecandidate = (event) => {
      if (event.candidate && wsRef.current?.readyState === 1) {
        wsRef.current.send(JSON.stringify({
          type: 'ice-candidate',
          candidate: event.candidate,
        }));
      }
    };

    pc.onconnectionstatechange = () => {
      console.log(`[Viewer] Connection state: ${pc.connectionState}`);
      if (pc.connectionState === 'connected') {
        setViewState('live');
      } else if (pc.connectionState === 'failed') {
        setViewState('error');
      } else if (pc.connectionState === 'disconnected') {
        setViewState('ended');
      }
    };

    try {
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);

      if (wsRef.current?.readyState === 1) {
        wsRef.current.send(JSON.stringify({
          type: 'offer',
          offer: offer,
        }));
      }
    } catch (err) {
      console.error('[Viewer] Error creating offer:', err);
      setViewState('error');
    }
  }, []);

  // Connect to signaling server
  const connectToStream = useCallback(() => {
    if (!matchId) return;
    if (wsRef.current?.readyState === 1) return; // Already connected

    setViewState('connecting');

    const protocol = window.location.protocol === 'https:' ? 'wss' : 'ws';
    const wsUrl = `${protocol}://${window.location.host}/ws/live-video?matchId=${matchId}&role=viewer`;
    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;

    ws.onopen = () => {
      console.log('[Viewer] Connected to signaling server');
    };

    ws.onmessage = async (event) => {
      try {
        const msg = JSON.parse(event.data);

        if (msg.type === 'welcome') {
          setViewerId(msg.viewerId);
          if (msg.broadcasterActive) {
            // Broadcaster is already live, create offer
            await createPeerAndOffer();
          } else {
            setViewState('idle');
          }
        } else if (msg.type === 'broadcaster-ready') {
          // Broadcaster just came online
          await createPeerAndOffer();
        } else if (msg.type === 'answer' && msg.from === 'broadcaster') {
          // Received answer from broadcaster
          if (pcRef.current && msg.answer) {
            try {
              await pcRef.current.setRemoteDescription(new RTCSessionDescription(msg.answer));
            } catch (err) {
              console.error('[Viewer] Error setting remote description:', err);
            }
          }
        } else if (msg.type === 'ice-candidate' && msg.from === 'broadcaster') {
          // ICE candidate from broadcaster
          if (pcRef.current && msg.candidate) {
            try {
              await pcRef.current.addIceCandidate(new RTCIceCandidate(msg.candidate));
            } catch (err) {
              console.error('[Viewer] Error adding ICE candidate:', err);
            }
          }
        } else if (msg.type === 'broadcaster-stopped') {
          setViewState('ended');
          if (pcRef.current) {
            pcRef.current.close();
            pcRef.current = null;
          }
          if (videoRef.current) {
            videoRef.current.srcObject = null;
          }
        }
      } catch (_) {}
    };

    ws.onerror = () => {
      setViewState('error');
    };

    ws.onclose = () => {
      // Try reconnecting after 3 seconds if video should still be active
      if (isVideoActive) {
        reconnectTimerRef.current = setTimeout(() => {
          connectToStream();
        }, 3000);
      }
    };
  }, [matchId, isVideoActive, createPeerAndOffer]);

  // Effect: connect/disconnect based on isVideoActive
  useEffect(() => {
    if (isVideoActive) {
      connectToStream();
    } else {
      cleanup();
      setViewState('idle');
    }

    return () => {
      cleanup();
    };
  }, [isVideoActive, matchId]); // eslint-disable-line react-hooks/exhaustive-deps

  // Fullscreen toggle
  const toggleFullscreen = () => {
    if (!containerRef.current) return;
    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen?.().then(() => setIsFullscreen(true)).catch(() => {});
    } else {
      document.exitFullscreen?.().then(() => setIsFullscreen(false)).catch(() => {});
    }
  };

  useEffect(() => {
    const handleFsChange = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', handleFsChange);
    return () => document.removeEventListener('fullscreenchange', handleFsChange);
  }, []);

  // Toggle mute
  const toggleMute = () => {
    if (videoRef.current) {
      videoRef.current.muted = !videoRef.current.muted;
      setIsMuted(videoRef.current.muted);
    }
  };

  // Don't render anything if video is not active and we're idle
  if (!isVideoActive && viewState === 'idle') {
    return null;
  }

  return (
    <div ref={containerRef} className="live-video-viewer">
      {/* Header */}
      <div className="viewer-header">
        <div className="viewer-header-left">
          <Radio size={16} className="text-[var(--live)]" />
          <span className="viewer-header-title">Live Video Feed</span>
        </div>
        {viewState === 'live' && (
          <span className="live-video-badge">
            <span className="live-dot" />
            LIVE
          </span>
        )}
      </div>

      {/* Video Container */}
      <div className="viewer-video-container">
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted={isMuted}
          className={`viewer-video ${viewState === 'live' ? 'viewer-video-live' : ''}`}
        />

        {/* Overlay states */}
        {viewState === 'connecting' && (
          <div className="viewer-overlay">
            <div className="viewer-overlay-spinner" />
            <p className="viewer-overlay-text">Connecting to live stream...</p>
          </div>
        )}

        {viewState === 'idle' && isVideoActive && (
          <div className="viewer-overlay">
            <Video size={40} className="text-[var(--on-surface-variant)]" style={{ opacity: 0.5 }} />
            <p className="viewer-overlay-text">Waiting for broadcaster...</p>
          </div>
        )}

        {viewState === 'ended' && (
          <div className="viewer-overlay">
            <VideoOff size={40} className="text-[var(--on-surface-variant)]" style={{ opacity: 0.5 }} />
            <p className="viewer-overlay-text">Broadcast has ended</p>
          </div>
        )}

        {viewState === 'error' && (
          <div className="viewer-overlay">
            <VideoOff size={40} className="text-[var(--error)]" style={{ opacity: 0.7 }} />
            <p className="viewer-overlay-text" style={{ color: 'var(--error)' }}>Connection error. Retrying...</p>
          </div>
        )}

        {/* Video Controls Overlay */}
        {viewState === 'live' && (
          <div className="viewer-controls-overlay">
            <button onClick={toggleMute} className="viewer-control-btn" title={isMuted ? 'Unmute' : 'Mute'}>
              {isMuted ? <VolumeX size={20} /> : <Volume2 size={20} />}
            </button>
            <button onClick={toggleFullscreen} className="viewer-control-btn" title={isFullscreen ? 'Exit Fullscreen' : 'Fullscreen'}>
              {isFullscreen ? <Minimize size={20} /> : <Maximize size={20} />}
            </button>
          </div>
        )}
      </div>

      {/* Unmute hint */}
      {viewState === 'live' && isMuted && (
        <button onClick={toggleMute} className="unmute-hint">
          <VolumeX size={14} />
          <span>Tap to unmute</span>
        </button>
      )}
    </div>
  );
}
