import './Navbar.css';
import { Menu, PanelLeftClose } from 'lucide-react';

const getInitials = (name = '') => {
  return name.slice(0, 2).toUpperCase();
};

const Navbar = ({ collapsed, isMobile, onMenuClick }) => {
  // Mocked user profile since there's no auth yet
  const user = { email: 'admin@attendance.pro' };

  return (
    <header className="navbar">
      <button className="navbar__toggle" onClick={onMenuClick} aria-label="Toggle sidebar">
        {/* on desktop: show open/close icon based on collapsed */}
        {/* on mobile: always hamburger */}
        {!isMobile && !collapsed
          ? <PanelLeftClose />
          : <Menu />
        }
      </button>

      <div className="navbar__right">
        <div className="navbar__user">
          <span className="navbar__avatar">{getInitials(user.email)}</span>
          <span className="navbar__email">{user.email}</span>
        </div>
      </div>
    </header>
  );
};

export default Navbar;
