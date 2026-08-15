import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext.jsx';
import styles from './Navbar.module.css';

const Navbar = () => {
  const { user, isAuthenticated, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  return (
    <nav className={styles.navbar}>
      <div className={styles.inner}>
        <Link to="/" className={styles.brand}>
          <span className={styles.brandIcon}>▶</span>
          <span className={styles.brandName}>Watch<span className={styles.brandAccent}>Party</span></span>
        </Link>

        <div className={styles.actions}>
          {isAuthenticated ? (
            <>
              <span className={styles.username}>
                <span className={styles.avatar}>{user?.username?.[0]?.toUpperCase()}</span>
                {user?.username}
              </span>
              <button
                id="navbar-logout-btn"
                className="btn btn-ghost btn-sm"
                onClick={handleLogout}
              >
                Sign Out
              </button>
            </>
          ) : (
            <>
              <Link to="/login" className="btn btn-ghost btn-sm">Sign In</Link>
              <Link to="/register" className="btn btn-primary btn-sm">Get Started</Link>
            </>
          )}
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
