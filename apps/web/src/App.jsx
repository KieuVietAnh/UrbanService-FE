// src/App.jsx
import { useEffect } from 'react';
import { BrowserRouter } from 'react-router-dom';
import { Analytics } from '@vercel/analytics/react';
import { SpeedInsights } from '@vercel/speed-insights/react';
import { AuthProvider } from './contexts/AuthContext';
import { AppRoutes } from './routes/AppRoutes';
import { toolsApi } from '@urbanmind/shared-api';

function App() {
  useEffect(() => {
    // Initialize mock database in localStorage (via shared-api tools)
    toolsApi.init();
    
    // Set default theme to light if not set
    const savedTheme = localStorage.getItem('urbanmind_theme') || 'light';
    document.documentElement.setAttribute('data-theme', savedTheme);
  }, []);

  return (
    <BrowserRouter>
      <AuthProvider>
        <AppRoutes />
        <Analytics />
        <SpeedInsights />
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
