import { useState } from 'react';
import RoleBadge from '../RoleBadge/RoleBadge.jsx';
import styles from './RoomHeader.module.css';

const RoomHeader = ({ room, connectionStatus, currentUserRole }) => {
  const [copied, setCopied] = useState(false);

  const handleCopyLink = () => {
    const url = `${window.location.origin}/join?code=${room?.roomCode}`;
    navigator.clipboard.writeText(url).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const statusLabel = {
    connected: 'Live',
    connecting: 'Connecting…',
    disconnected: 'Disconnected',
  }[connectionStatus] || 'Unknown';

  return (
    <header className={styles.header}>
      <div className={styles.left}>
        <div className={styles.titleGroup}>
          <h1 className={styles.title}>
            Room <span className={styles.code}>{room?.roomCode}</span>
          </h1>
          {currentUserRole && <RoleBadge role={currentUserRole} />}
        </div>
        <div className={styles.meta}>
          <span className={`status-dot ${connectionStatus}`} />
          <span className={styles.statusText}>{statusLabel}</span>
        </div>
      </div>

      <button
        id="copy-invite-btn"
        className={`btn btn-secondary btn-sm ${styles.copyBtn}`}
        onClick={handleCopyLink}
      >
        {copied ? '✓ Copied!' : '🔗 Invite Link'}
      </button>
    </header>
  );
};

export default RoomHeader;
