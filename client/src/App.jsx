import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import MainLayout from "./layouts/MainLayout/MainLayout";
import AttendanceLogs from "./pages/AttendanceLogs";
import Employees from "./pages/Employees";
import Shifts from "./pages/Shifts";
import './index.css';

function App() {
  return (
    <Router>
      <Routes>
        <Route element={<MainLayout />}>
          <Route path="/" element={<Navigate to="/logs" replace />} />
          <Route path="/logs" element={<AttendanceLogs />} />
          <Route path="/employees" element={<Employees />} />
          <Route path="/shifts" element={<Shifts />} />
        </Route>
      </Routes>
    </Router>
  );
}

export default App;
