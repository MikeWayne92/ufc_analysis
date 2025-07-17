import React from 'react';
import { createRoot } from 'react-dom/client';
import UFCDashboard from './ufc_dashboard';
import './index.css';

const container = document.getElementById('root');
if (container) {
  const root = createRoot(container);
  root.render(
    <React.StrictMode>
      <UFCDashboard />
    </React.StrictMode>
  );
} 