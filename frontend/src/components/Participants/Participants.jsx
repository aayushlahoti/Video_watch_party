import { useState } from 'react';
import RoleBadge from '../RoleBadge/RoleBadge.jsx';
import { useAuth } from '../../context/AuthContext.jsx';
import { getSocket } from '../../socket/socketService.js';
import styles from './Participants.module.css';

const Participants = ({ participants, roomId, currentUserRole }) => {
  const { user } = useAuth();
  const [loadingUserId, setLoadingUserId] = useState(null);

  const socket = getSocket();

  const handleAssignRole = (targetUserId, newRole) => {
    if (!socket) return;
    setLoadingUserId(targetUserId);
    socket.emit('assign-role', { roomId, targetUserId, role: newRole });
    setTimeout(() => setLoadingUserId(null), 1000);
  };

  const handleTransferHost = (targetUserId) => {
    if (!socket) return;
    socket.emit('transfer-host', { roomId, targetUserId });
  };

  const handleRemoveUser = (targetUserId) => {
    if (!socket) return;
    socket.emit('remove-user', { roomId, targetUserId });
  };

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h3 className={styles.title}>Participants</h3>
        <span className={styles.count}>{participants.length}</span>
      </div>

      <ul className={styles.list}>
        {participants.map((p) => {
          const participantUserId = p.userId || p.userId?._id || p.userId;
          const isCurrentUser = participantUserId === user?.id;
          const isSelf = isCurrentUser;
          const isLoading = loadingUserId === participantUserId;

          return (
            <li key={p.socketId || participantUserId} className={styles.item}>
              <div className={styles.userInfo}>
                <span className={styles.avatar}>
                  {(p.username || '?')[0].toUpperCase()}
                </span>
                <div className={styles.userDetails}>
                  <span className={styles.username}>
                    {p.username}
                    {isSelf && <span className={styles.youTag}>(you)</span>}
                  </span>
                  <RoleBadge role={p.role} />
                </div>
              </div>

              {/* Actions — only show for host acting on non-self participants */}
              {currentUserRole === 'host' && !isSelf && (
                <div className={styles.actions}>
                  {isLoading ? (
                    <span className="spinner" />
                  ) : (
                    <>
                      {p.role !== 'moderator' && (
                        <button
                          className="btn btn-ghost btn-sm"
                          title="Make Moderator"
                          onClick={() => handleAssignRole(participantUserId, 'moderator')}
                          id={`assign-mod-${participantUserId}`}
                        >
                          🛡
                        </button>
                      )}
                      {p.role === 'moderator' && (
                        <button
                          className="btn btn-ghost btn-sm"
                          title="Remove Moderator"
                          onClick={() => handleAssignRole(participantUserId, 'participant')}
                          id={`remove-mod-${participantUserId}`}
                        >
                          👤
                        </button>
                      )}
                      <button
                        className="btn btn-ghost btn-sm"
                        title="Transfer Host"
                        onClick={() => handleTransferHost(participantUserId)}
                        id={`transfer-host-${participantUserId}`}
                      >
                        👑
                      </button>
                      <button
                        className="btn btn-danger btn-sm"
                        title="Remove from Room"
                        onClick={() => handleRemoveUser(participantUserId)}
                        id={`remove-user-${participantUserId}`}
                      >
                        ✕
                      </button>
                    </>
                  )}
                </div>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
};

export default Participants;
