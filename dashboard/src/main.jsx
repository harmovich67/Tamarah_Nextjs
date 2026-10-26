import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './styles/index.css';
import App from './App.jsx';
import { config } from './lib/config';
import { watchStaleChunks } from './lib/staleChunk';

watchStaleChunks();

// Mock mode: re-publish the saved settings so the storefront picks them up even if it was opened after the save.
if (config.apiMode === 'mock') import('./services/adapters/mock/settings').then((m) => m.syncSettingsToStorefront());

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
