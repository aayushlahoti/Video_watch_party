import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { roomsApi } from '../../api/index.js';
import styles from './JoinRoom.module.css';

const JoinRoom = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [roomCode, setRoomCode] = useState(searchParams.get('code') || '');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const codeParam = searchParams.get('code');
    if (codeParam) {
      setRoomCode(codeParam.toUpperCase());
    }
  }, [searchParams]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const cleanCode = roomCode.trim().toUpperCase();
    if (!cleanCode) {
      setError('Please enter a room code.');
      return;
    }

    setLoading(true);
    setError('');
    try {
      // For join room, the user might input roomCode or roomId.
      // If roomCode is passed, let's join or lookup by room.
      // We will attempt to call join API with the ID/Code provided
      const res = await roomsApi.join(cleanCode);
      const room = res.data.data.room;
      navigate(`/room/${room._id}`);
    } catch (err) {
      setError(err.response?.data?.message || 'Room not found or failed to join.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.container}>
      <div className={styles.card}>
        <div className={styles.header}>
          <h1 className={styles.title}>Join a Watch Room</h1>
          <p className={styles.subtitle}>Enter the room code shared by your friend</p>
        </div>

        {error && <div className="alert alert-error">{error}</div>}

        <form onSubmit={handleSubmit} className={styles.form}>
          <div className="input-group">
            <label className="input-label" htmlFor="room-code-input">Room Code / ID</label>
            <input
              id="room-code-input"
              type="text"
              className="input"
              placeholder="e.g. 665F12A9 or Mongo ID"
              value={roomCode}
              onChange={(e) => {
                setRoomCode(e.target.value);
                if (error) setError('');
              }}
              required
            />
          </div>

          <button
            id="join-room-btn"
            type="submit"
            className="btn btn-primary btn-full btn-lg"
            disabled={loading}
          >
            {loading ? <span className="spinner" /> : 'Join Room'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default JoinRoom;
