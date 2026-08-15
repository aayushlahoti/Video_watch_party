import styles from './RoleBadge.module.css';

const ROLE_LABELS = {
  host: '👑 Host',
  moderator: '🛡 Mod',
  participant: '● Viewer',
};

const RoleBadge = ({ role }) => {
  const label = ROLE_LABELS[role] || role;
  return (
    <span className={`badge badge-${role} ${styles.badge}`}>
      {label}
    </span>
  );
};

export default RoleBadge;
