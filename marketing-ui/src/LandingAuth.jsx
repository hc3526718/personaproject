import { useEffect, useState } from 'react';
import { readLandingSession } from './landingSession';

export default function LandingAuth() {
  const [session, setSession] = useState(null);

  useEffect(() => {
    const refresh = () => setSession(readLandingSession());
    refresh();
    window.addEventListener('storage', refresh);
    window.addEventListener('dalton-auth-changed', refresh);
    return () => {
      window.removeEventListener('storage', refresh);
      window.removeEventListener('dalton-auth-changed', refresh);
    };
  }, []);

  if (session?.avatarUrl) {
    return (
      <a href="/app" className="landing-auth landing-auth--profile" aria-label="Open your profile in the app">
        <img src={session.avatarUrl} alt="" className="landing-auth__avatar" referrerPolicy="no-referrer" />
        <span className="landing-auth__label">{session.label}</span>
      </a>
    );
  }

  return (
    <a href="/app" className="landing-auth landing-auth--cta" aria-label="Log in or sign up for Grant Access">
      Log in / Sign up
    </a>
  );
}
