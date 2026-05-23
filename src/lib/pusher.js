import Pusher from 'pusher';

// Server-side Pusher instance — used in API routes to publish events
// Lazily initialized to avoid issues during build time
let pusherServer = null;

function getPusherServer() {
  if (!pusherServer) {
    pusherServer = new Pusher({
      appId: process.env.PUSHER_APP_ID,
      key: process.env.PUSHER_KEY,
      secret: process.env.PUSHER_SECRET,
      cluster: process.env.PUSHER_CLUSTER,
      useTLS: true,
    });
  }
  return pusherServer;
}

/**
 * Broadcast a match update to all subscribed clients via Pusher.
 * Drop-in replacement for the old `global.broadcastMatchUpdate()`.
 * 
 * Pusher has a 10KB payload limit per event. Match data should be well within
 * this limit, but if it ever exceeds it, we broadcast a lightweight signal 
 * and let clients re-fetch.
 */
export async function broadcastMatchUpdate(matchData) {
  try {
    const payload = JSON.stringify(matchData);

    // Pusher max payload is 10KB. If match data exceeds it, send a refetch signal instead.
    if (payload.length > 9000) {
      await getPusherServer().trigger('cricket-live', 'match-update', {
        _id: matchData._id,
        _refetch: true,
      });
      console.log(`[Pusher] Match ${matchData._id} payload too large (${payload.length}B), sent refetch signal.`);
    } else {
      await getPusherServer().trigger('cricket-live', 'match-update', matchData);
      console.log(`[Pusher] Broadcasted match update for ${matchData._id} (${payload.length}B)`);
    }
  } catch (err) {
    // Log but don't throw — broadcasting failures should not break API responses
    console.error('[Pusher] Failed to broadcast match update:', err.message);
  }
}

// Client-side configuration constants (safe to expose — Pusher keys are public by design)
export const PUSHER_CLIENT_KEY = process.env.NEXT_PUBLIC_PUSHER_KEY;
export const PUSHER_CLIENT_CLUSTER = process.env.NEXT_PUBLIC_PUSHER_CLUSTER;
