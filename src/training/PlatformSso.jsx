import React, { useEffect, useRef, useState } from 'react';
import { clearAuth } from '../auth';

const REFUSED = "Open this from the platform's Training tab";

export default function PlatformSso() {
  const [token] = useState(() => new URLSearchParams(window.location.hash.slice(1)).get('token'));
  const [failed, setFailed] = useState(false);
  const exchange = useRef(null);
  useEffect(() => {
    let live = true;
    // Remove the fragment before making any request or navigating away.
    window.history.replaceState(null, '', window.location.pathname + window.location.search);
    if (!exchange.current) {
      clearAuth();
      exchange.current = token ? fetch(`${process.env.REACT_APP_API_URL || ''}/api/certsync-training/sso/`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token }), cache: 'no-store', credentials: 'omit',
      }).then(async (response) => {
        if (!response.ok) throw new Error(REFUSED);
        const pair = await response.json();
        if (!pair.access || !pair.refresh) throw new Error(REFUSED);
        return pair;
      }) : Promise.reject(new Error(REFUSED));
    }
    exchange.current.then((pair) => {
      if (!live) return;
      localStorage.setItem('certsyncTraining', pair.training ? 'true' : 'false');
      localStorage.setItem('accessToken', pair.access);
      localStorage.setItem('refreshToken', pair.refresh);
      const theme = new URLSearchParams(window.location.search).get('theme');
      if (theme === 'dark' || theme === 'light') localStorage.setItem('theme', theme);
      window.location.replace('/events');
    }).catch(() => { if (live) setFailed(true); });
    return () => { live = false; };
  }, [token]);
  return <main className="container py-5"><p role={failed ? 'alert' : 'status'}>
    {failed ? REFUSED : 'Signing you into CTI4BC…'}
  </p></main>;
}
