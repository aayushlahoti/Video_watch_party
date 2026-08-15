import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext.jsx';
import styles from './Home.module.css';

const Home = () => {
  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();

  return (
    <div className={styles.page}>
      {/* Hero Section */}
      <section className={styles.hero}>
        <div className={styles.heroGlow} />
        <div className={styles.heroContent}>
          <div className={styles.heroBadge}>
            <span className={styles.liveDot} />
            Real-time YouTube Sync
          </div>
          <h1 className={styles.heroTitle}>
            Watch Together,<br />
            <span className={styles.heroTitleGradient}>Anywhere.</span>
          </h1>
          <p className={styles.heroSubtitle}>
            Create a room, invite friends, and enjoy synchronized YouTube playback.
            Every play, pause, and seek happens in perfect harmony — powered by WebSockets.
          </p>

          {isAuthenticated ? (
            <div className={styles.heroActions}>
              <button
                id="home-create-room-btn"
                className="btn btn-primary btn-lg"
                onClick={() => navigate('/create-room')}
              >
                ✦ Create a Room
              </button>
              <button
                id="home-join-room-btn"
                className="btn btn-secondary btn-lg"
                onClick={() => navigate('/join-room')}
              >
                Join a Room
              </button>
            </div>
          ) : (
            <div className={styles.heroActions}>
              <Link to="/register" id="home-get-started-btn" className="btn btn-primary btn-lg">
                Get Started Free
              </Link>
              <Link to="/login" id="home-sign-in-link" className="btn btn-secondary btn-lg">
                Sign In
              </Link>
            </div>
          )}
        </div>
      </section>

      {/* Features Section */}
      <section className={styles.features}>
        <div className="container">
          <h2 className={styles.featuresTitle}>Everything you need to watch together</h2>
          <div className={styles.featuresGrid}>
            {FEATURES.map((f) => (
              <div key={f.title} className={styles.featureCard}>
                <div className={styles.featureIcon}>{f.icon}</div>
                <h3 className={styles.featureTitle}>{f.title}</h3>
                <p className={styles.featureDesc}>{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      {!isAuthenticated && (
        <section className={styles.cta}>
          <div className={styles.ctaCard}>
            <h2 className={styles.ctaTitle}>Ready to watch together?</h2>
            <p className={styles.ctaDesc}>Sign up in seconds. No credit card required.</p>
            <Link to="/register" id="home-cta-btn" className="btn btn-primary btn-lg">
              Start Watching Now
            </Link>
          </div>
        </section>
      )}
    </div>
  );
};

const FEATURES = [
  {
    icon: '⚡',
    title: 'Real-Time Sync',
    desc: 'Instant synchronization via WebSockets. Play, pause, and seek stays in sync across all viewers.',
  },
  {
    icon: '🎭',
    title: 'Role Management',
    desc: 'Hosts can assign moderators, transfer control, and manage participants in the room.',
  },
  {
    icon: '🔐',
    title: 'Secure Rooms',
    desc: 'JWT-authenticated sessions and invite-only rooms. All permissions are verified on the server.',
  },
  {
    icon: '🎬',
    title: 'YouTube Player',
    desc: 'Full YouTube IFrame API integration with playback control and video switching.',
  },
  {
    icon: '👥',
    title: 'Participant List',
    desc: 'See who\'s in the room with live updates as people join and leave.',
  },
  {
    icon: '🔗',
    title: 'Easy Sharing',
    desc: 'Copy invite links instantly and share with friends to join your room.',
  },
];

export default Home;
