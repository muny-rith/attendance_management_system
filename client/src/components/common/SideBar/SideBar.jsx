import { NavLink } from "react-router-dom";
import { ClipboardList, Users, Clock } from "lucide-react";
import logoImg from "../../../assets/logo.png";
import "./SideBar.css";

const navItems = [
  {
    label: "Attendance Logs",
    path: "/logs",
    icon: <ClipboardList />,
  },
  {
    label: "Employees",
    path: "/employees",
    icon: <Users />,
  },
  {
    label: "Shifts",
    path: "/shifts",
    icon: <Clock />,
  },
];

export default function SideBar({ collapsed, isMobile, onClose }) {
  const containerClass = `sidebar ${collapsed ? "sidebar--collapsed" : ""}`;

  return (
    <div className={containerClass}>
      {/* Logo */}
      <div className="sidebar__logo">
        <img src={logoImg} alt="Logo" style={{ width: 32, height: 32, objectFit: 'contain', flexShrink: 0 }} />
        <span className="sidebar__logo-text">Moon Attendance</span>
      </div>

      {/* Navigation */}
      <ul className="sidebar__nav">
        {navItems.map((item) => (
          <li key={item.path}>
            <NavLink
              to={item.path}
              className={({ isActive }) =>
                `sidebar__link ${isActive ? "sidebar__link--active" : ""}`
              }
              onClick={() => {
                if (isMobile && onClose) {
                  onClose();
                }
              }}
            >
              <span className="sidebar__icon">{item.icon}</span>
              <span className="sidebar__label">{item.label}</span>
            </NavLink>
          </li>
        ))}
      </ul>
    </div>
  );
}
