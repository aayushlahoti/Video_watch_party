import { useEffect, useRef, useCallback } from 'react';
import { useRoom } from '../../context/RoomContext.jsx';
import styles from './Player.module.css';

const YOUTUBE_IFRAME_API_URL = 'https://www.youtube.com/iframe_api';

let apiLoaded = false;
let apiLoadPromise = null;

/**
 * Load the YouTube IFrame Player API script once.
 */
const loadYouTubeAPI = () => {
  if (apiLoaded) return Promise.resolve();
  if (apiLoadPromise) return apiLoadPromise;

  apiLoadPromise = new Promise((resolve) => {
    const existing = document.getElementById('youtube-iframe-api');
    if (!existing) {
      const script = document.createElement('script');
      script.id = 'youtube-iframe-api';
      script.src = YOUTUBE_IFRAME_API_URL;
      script.async = true;
      document.head.appendChild(script);
    }

    window.onYouTubeIframeAPIReady = () => {
      apiLoaded = true;
      resolve();
    };
  });

  return apiLoadPromise;
};

/**
 * YouTube IFrame Player component.
 * Exposes play, pause, seek, and loadVideo through the RoomContext playerRef.
 */
const Player = ({ videoId, isPrivileged, onPlay, onPause }) => {
  const containerRef = useRef(null);
  const playerInstanceRef = useRef(null);
  const { setPlayerRef, roomState } = useRoom();
  const ignoreEventsRef = useRef(false);

  const initPlayer = useCallback(async () => {
    await loadYouTubeAPI();

    if (!containerRef.current) return;

    // Remove existing player
    if (playerInstanceRef.current) {
      playerInstanceRef.current.destroy();
    }

    const initialVideoId = videoId || 'dQw4w9WgXcQ'; // fallback

    playerInstanceRef.current = new window.YT.Player(containerRef.current, {
      videoId: initialVideoId,
      playerVars: {
        rel: 0,
        modestbranding: 1,
        enablejsapi: 1,
        origin: window.location.origin,
        playsinline: 1,
      },
      events: {
        onReady: (e) => {
          setPlayerRef(e.target);
          // Apply current room state if it exists
          if (roomState.currentTime > 0) {
            e.target.seekTo(roomState.currentTime, true);
          }
          if (!roomState.isPlaying) {
            setTimeout(() => e.target.pauseVideo(), 300);
          }
        },
        onStateChange: (e) => {
          if (ignoreEventsRef.current) return;
          const YT = window.YT;
          if (e.data === YT.PlayerState.PLAYING) {
            if (isPrivileged && onPlay) {
              onPlay(e.target.getCurrentTime());
            } else if (!isPrivileged) {
              // Participants can't control — pause immediately
              ignoreEventsRef.current = true;
              e.target.pauseVideo();
              setTimeout(() => { ignoreEventsRef.current = false; }, 500);
            }
          } else if (e.data === YT.PlayerState.PAUSED) {
            if (isPrivileged && onPause) {
              onPause(e.target.getCurrentTime());
            }
          }
        },
      },
    });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    initPlayer();

    return () => {
      if (playerInstanceRef.current) {
        playerInstanceRef.current.destroy();
        playerInstanceRef.current = null;
        setPlayerRef(null);
      }
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Load a new video when videoId changes
  useEffect(() => {
    if (videoId && playerInstanceRef.current) {
      try {
        playerInstanceRef.current.loadVideoById({ videoId, startSeconds: 0 });
        setTimeout(() => playerInstanceRef.current?.pauseVideo(), 500);
      } catch {
        // Player might not be ready yet
      }
    }
  }, [videoId]);

  return (
    <div className={styles.wrapper}>
      <div className={styles.aspectBox}>
        <div ref={containerRef} className={styles.playerEl} id="youtube-player" />
        {!isPrivileged && (
          <div className={styles.overlay} title="Only the host or moderator can control playback" />
        )}
      </div>
    </div>
  );
};

export default Player;
