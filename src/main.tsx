import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import './index.css'; // Ensure CSS is imported if it exists, or remove if handled in HTML

const container = document.getElementById('root');
if (container) {
    const root = createRoot(container);
    root.render(
        <React.StrictMode>
            <App />
        </React.StrictMode>
    );
}
