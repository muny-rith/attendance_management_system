import { Outlet } from "react-router-dom";
import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import Sidebar from "../../components/common/SideBar/SideBar";
import Navbar from "../../components/common/Navbar/Navbar";
import styles from "./MainLayout.module.css";

const SIDEBAR_WIDTH = 250;
const SIDEBAR_COLLAPSED = 80;

export default function MainLayout() {
  const [collapsed, setCollapsed]   = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [isMobile, setIsMobile]     = useState(window.innerWidth < 768);

  useEffect(() => {
    const onResize = () => {
      const mobile = window.innerWidth < 768;
      setIsMobile(mobile);
      if (!mobile) setMobileOpen(false);
    };
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  // Sidebar animation
  const sidebarVariants = {
    // Desktop
    expanded:  { width: SIDEBAR_WIDTH,     x: 0,                   transition: { duration: 0.3, ease: "easeInOut" } },
    collapsed: { width: SIDEBAR_COLLAPSED, x: 0,                   transition: { duration: 0.3, ease: "easeInOut" } },
    // Mobile
    mobileOpen:   { x: 0,                  width: SIDEBAR_WIDTH,   transition: { duration: 0.3, ease: "easeInOut" } },
    mobileClosed: { x: -SIDEBAR_WIDTH,     width: SIDEBAR_WIDTH,   transition: { duration: 0.3, ease: "easeInOut" } },
  };

  // Main content shift (desktop only)
  const mainVariants = {
    expanded:  { marginLeft: SIDEBAR_WIDTH,     transition: { duration: 0.3, ease: "easeInOut" } },
    collapsed: { marginLeft: SIDEBAR_COLLAPSED, transition: { duration: 0.3, ease: "easeInOut" } },
    mobile:    { marginLeft: 0,                 transition: { duration: 0.3, ease: "easeInOut" } },
  };

  const getSidebarAnimate = () => {
    if (isMobile) return mobileOpen ? "mobileOpen" : "mobileClosed";
    return collapsed ? "collapsed" : "expanded";
  };

  const getMainAnimate = () => {
    if (isMobile) return "mobile";
    return collapsed ? "collapsed" : "expanded";
  };

  return (
    <div className={styles.layout}>

      {/* Backdrop (mobile only) */}
      {isMobile && mobileOpen && (
        <div
          className={styles.backdrop}
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Sidebar */}
      <motion.div
        className={styles.sidebar}
        variants={sidebarVariants}
        animate={getSidebarAnimate()}
        initial={false}
      >
        <Sidebar
          collapsed={collapsed && !isMobile}
          isMobile={isMobile}
          onClose={() => setMobileOpen(false)}
        />
      </motion.div>

      {/* Main */}
      <motion.div
        className={styles.main}
        variants={mainVariants}
        animate={getMainAnimate()}
        initial={false}
      >
        {/* Navbar */}
        <div className={styles.navbar}>
          <Navbar
            collapsed={collapsed}
            isMobile={isMobile}
            onMenuClick={() =>
              isMobile
                ? setMobileOpen(true)
                : setCollapsed((c) => !c)
            }
          />
        </div>

        {/* Page content */}
        <div className={styles.content}>
          <Outlet />
        </div>
      </motion.div>

    </div>
  );
}
