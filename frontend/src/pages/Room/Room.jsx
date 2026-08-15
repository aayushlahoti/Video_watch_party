import { useEffect, useState, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { roomsApi } from '../../api/index.js';
import { useAuth } from '../../context/AuthContext.jsx';
import { useRoom } from '../../context/RoomContext.jsx';
import { useRoomSocket } from '../../hooks/useRoomSocket.js';
import RoomHeader from '../../components/RoomHeader/RoomHeader.jsx';
import Player from '../../components/Player/Player.jsx';
import Controls from '../../components/Controls/Controls.jsx';
import Participants from '../../components/Participants/Participants.jsx';
import styles from './Room.module.css';

const Room = () => {
  const { id: roomId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const {
    room,
    setRoom,
    participants,
    roomState,
    connectionStatus,
    clearRoom,
    emitPlay,
    emitPause,
    emitSeek,
  } = useRoom();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Register socket handlers
  useRoomSocket(roomId, user?.id);

  // Fetch initial room details via REST API
  useEffect(() => {
    let isMounted = true;

    const fetchRoom = async () => {
      setLoading(true);
      setError('');
      try {
        const res = await roomsApi.get(roomId);
        if (isMounted) {
          setRoom(res.data.data.room);
        }
      } catch (err) {
        if (isMounted) {
          setError(err.response?.data?.message || 'Failed to load room.');
        }
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    if (roomId) fetchRoom();

    return () => {
      isMounted = false;
      clearRoom();
    };
  }, [roomId, setRoom, clearRoom]);

  // Compute current user's role in the room
  const currentUserRole = useMemo(() => {
    if (!user || !participants.length) {
      if (room?.host === user?.id || room?.host?._id === user?.id) return 'host';
      return 'participant';
    }
    const found = participants.find(
      (p) => (p.userId?._id || p.userId) === user.id
    );
    return found ? found.role : 'participant';
  }, [user, participants, room]);

  const isPrivileged = currentUserRole === 'host' || currentUserRole === 'moderator';

  const handleLeaveRoom = async () => {
    try {
      await roomsApi.leave(roomId);
    } catch {
      // Ignore API error on leave
    } finally {
      clearRoom();
      navigate('/');
    }
  };

  if (loading) {
    return (
      <div className="page-loader">
        <span className="spinner spinner-lg" />
        <p>Connecting to room...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className={styles.errorContainer}>
        <div className="alert alert-error">{error}</div>
        <button className="btn btn-secondary" onClick={() => navigate('/')}>
          Return Home
        </button>
      </div>
    );
  }

  return (
    <div className={styles.roomPage}>
      <div className="container">
        {/* Header */}
        <div className={styles.headerRow}>
          <RoomHeader
            room={room}
            connectionStatus={connectionStatus}
            currentUserRole={currentUserRole}
          />
          <button
            id="leave-room-btn"
            className="btn btn-ghost btn-sm"
            onClick={handleLeaveRoom}
          >
            Leave Room
          </button>
        </div>

        {/* Main Grid */}
        <div className={styles.grid}>
          {/* Left Column: Player & Controls */}
          <div className={styles.mainColumn}>
            <Player
              videoId={roomState.videoId}
              isPrivileged={isPrivileged}
              onPlay={(time) => emitPlay(roomId, time)}
              onPause={(time) => emitPause(roomId, time)}
              onSeek={(time) => emitSeek(roomId, time)}
            />
            <Controls
              roomId={roomId}
              isPrivileged={isPrivileged}
            />
          </div>

          {/* Right Column: Participants List */}
          <div className={styles.sideColumn}>
            <Participants
              participants={participants}
              roomId={roomId}
              currentUserRole={currentUserRole}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default Room;
