import { useState } from 'react';
import { useRoom } from '../../context/RoomContext.jsx';
import styles from './Controls.module.css';

/**
 * Extract a YouTube video ID from a URL or return the string as-is if it looks like an ID.
 */
const extractVideoId = (input) => {
  const trimmed = input.trim();
  // Already a bare video ID (11 chars, alphanumeric + - _)
  if (/^[a-zA-Z0-9_-]{11}$/.test(trimmed)) return trimmed;

  // Try various YouTube URL formats
  const patterns = [
    /[?&]v=([a-zA-Z0-9_-]{11})/,
    /youtu\.be\/([a-zA-Z0-9_-]{11})/,
    /youtube\.com\/embed\/([a-zA-Z0-9_-]{11})/,
    /youtube\.com\/shorts\/([a-zA-Z0-9_-]{11})/,
  ];

  for (const pattern of patterns) {
    const match = trimmed.match(pattern);
    if (match) return match[1];
  }

  return null;
};

const Controls = ({ roomId, isPrivileged, playerRef: playerRefProp }) => {
  const { emitPlay, emitPause, emitChangeVideo, playerRef: contextPlayerRef } = useRoom();
  const player = (playerRefProp || contextPlayerRef)?.current;

  const [videoInput, setVideoInput] = useState('');
  const [videoError, setVideoError] = useState('');

  const handlePlay = () => {
    if (!player) return;
    const currentTime = player.getCurrentTime?.() || 0;
    emitPlay(roomId, currentTime);
    player.playVideo?.();
  };

  const handlePause = () => {
    if (!player) return;
    const currentTime = player.getCurrentTime?.() || 0;
    emitPause(roomId, currentTime);
    player.pauseVideo?.();
  };

  const handleChangeVideo = () => {
    if (!videoInput.trim()) return;
    const videoId = extractVideoId(videoInput);
    if (!videoId) {
      setVideoError('Invalid YouTube URL or video ID.');
      return;
    }
    setVideoError('');
    emitChangeVideo(roomId, videoId);
    setVideoInput('');
  };

  const handleInputKeyDown = (e) => {
    if (e.key === 'Enter') handleChangeVideo();
  };

  if (!isPrivileged) {
    return (
      <div className={styles.viewerBanner}>
        <span className={styles.viewerIcon}>👁</span>
        <span>You are watching as a viewer. Only the host or moderator can control playback.</span>
      </div>
    );
  }

  return (
    <div className={styles.controls}>
      <div className={styles.playbackGroup}>
        <button
          id="btn-play"
          className={`btn btn-primary ${styles.playBtn}`}
          onClick={handlePlay}
          title="Play"
        >
          ▶ Play
        </button>
        <button
          id="btn-pause"
          className={`btn btn-secondary ${styles.pauseBtn}`}
          onClick={handlePause}
          title="Pause"
        >
          ⏸ Pause
        </button>
      </div>

      <div className={styles.videoInputGroup}>
        <input
          id="video-url-input"
          type="text"
          className="input"
          placeholder="Paste YouTube URL or video ID…"
          value={videoInput}
          onChange={(e) => {
            setVideoInput(e.target.value);
            setVideoError('');
          }}
          onKeyDown={handleInputKeyDown}
        />
        <button
          id="btn-change-video"
          className="btn btn-secondary"
          onClick={handleChangeVideo}
          disabled={!videoInput.trim()}
        >
          Change Video
        </button>
      </div>

      {videoError && <p className="input-error">{videoError}</p>}
    </div>
  );
};

export default Controls;
