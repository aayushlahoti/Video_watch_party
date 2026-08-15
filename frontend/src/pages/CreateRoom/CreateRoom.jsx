import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { roomsApi } from '../../api/index.js';
import styles from './CreateRoom.module.css';

const CreateRoom = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleCreate = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await roomsApi.create();
      const room = res.data.data.room;
      navigate(`/room/${room._id}`);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to create room.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.container}>
      <div className={styles.card}>
        <div className={styles.icon}>✦</div>
        <h1 className={styles.title}>Create a Watch Room</h1>
        <p className={styles.subtitle}>
          You will automatically become the room Host with full controls to play, pause, seek, and manage participants.
        </p>

        {error && <div className="alert alert-error">{error}</div>}

        <button
          id="create-room-btn"
          className="btn btn-primary btn-full btn-lg"
          onClick={handleCreate}
          disabled={loading}
        >
          {loading ? <span className="spinner" /> : 'Create Room Now'}
        </button>
      </div>
    </div>
  );
};

export default CreateRoom;
