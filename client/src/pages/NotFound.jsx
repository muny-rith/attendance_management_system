import { Link, useLocation, useNavigate } from 'react-router-dom';
import { ArrowLeft, ClipboardList, SearchX } from 'lucide-react';
import './NotFound.css';

/**
 * Fallback view rendered inside MainLayout when a route path does not match.
 */
export default function NotFound() {
  const location = useLocation();
  const navigate = useNavigate();

  const requestedPath = `${location.pathname}${location.search}`;

  const handleGoBack = () => {
    if (window.history.length > 1) {
      navigate(-1);
    } else {
      navigate('/logs', { replace: true });
    }
  };

  return (
    <div className="not-found-page">
      <div className="not-found-card">
        <div className="not-found-icon-wrap" aria-hidden="true">
          <SearchX size={36} strokeWidth={1.75} />
        </div>

        <span className="not-found-badge">404 • Page Not Found</span>

        <h1 className="not-found-title">We couldn&apos;t find that page</h1>

        <p className="not-found-description">
          The URL <code className="not-found-path">{requestedPath}</code> doesn&apos;t match any
          page in Moon Attendance.
        </p>

        <div className="not-found-actions">
          <Link to="/logs" className="not-found-btn not-found-btn--primary">
            <ClipboardList size={18} />
            <span>Go to Attendance Logs</span>
          </Link>

          <button
            type="button"
            onClick={handleGoBack}
            className="not-found-btn not-found-btn--secondary"
          >
            <ArrowLeft size={18} />
            <span>Go Back</span>
          </button>
        </div>
      </div>
    </div>
  );
}
