import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';
import reportWebVitals from './reportWebVitals';
import { ThemeProvider } from './ThemeContext';
// Montimage brand re-skin — imported LAST so its token overrides win the cascade
import './theme/montimage-theme.css';
import './theme/patterns.css';
// The CERT-SYNCHRONY palette. The build switch decides whether it applies:
// the attribute is what its rules are scoped on, so a build without the flag
// renders CTI4BC exactly as it does on main. Set before the first render, so
// the frame never flashes the wrong colours.
import './theme/certsync-theme.css';
if (process.env.REACT_APP_CERTSYNC_THEME === 'true') {
  document.documentElement.setAttribute('data-certsync-theme', 'true');
}

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <ThemeProvider>
      <App />
    </ThemeProvider>
  </React.StrictMode>
);

// If you want to start measuring performance in your app, pass a function
// to log results (for example: reportWebVitals(console.log))
// or send to an analytics endpoint. Learn more: https://bit.ly/CRA-vitals
reportWebVitals();
