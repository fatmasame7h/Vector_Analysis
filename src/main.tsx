import React from 'react';
import ReactDOM from 'react-dom/client';
import { HashRouter } from 'react-router-dom';
import App from './App';
import { ThemeProvider } from './context/ThemeContext';
import { SettingsProvider } from './context/SettingsContext';
import { HistoryProvider } from './context/HistoryContext';
import { WorkspaceProvider } from './context/WorkspaceContext';
import './index.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ThemeProvider>
      <SettingsProvider>
        <HistoryProvider>
          <HashRouter>
            <WorkspaceProvider>
              <App />
            </WorkspaceProvider>
          </HashRouter>
        </HistoryProvider>
      </SettingsProvider>
    </ThemeProvider>
  </React.StrictMode>,
);
