import { createRoot } from 'react-dom/client';
import StaggeredMenu from './StaggeredMenu';
import ScreenshotCarousel from './ScreenshotCarousel';
import './StaggeredMenu.css';
import './ScreenshotCarousel.css';

const MENU_ITEMS = [
  { label: 'Home', ariaLabel: 'Go to home page', link: '/' },
  { label: 'How', ariaLabel: 'How Grant Access works', link: '/how' },
  { label: 'Features', ariaLabel: 'View features', link: '/features' },
  { label: 'Help', ariaLabel: 'Help centre', link: '/help-center' },
  { label: 'Contact', ariaLabel: 'Contact us', link: '/contact-us' },
  { label: 'Login', ariaLabel: 'Log in to the app', link: '/app' },
];

const SHOWCASE_IMAGES = [
  { src: '/showcase/01.png', alt: 'Community feed' },
  { src: '/showcase/02.png', alt: 'Messages inbox' },
  { src: '/showcase/03.png', alt: 'Events list' },
  { src: '/showcase/04.png', alt: 'Sponsors' },
  { src: '/showcase/05.png', alt: 'Media browse' },
  { src: '/showcase/06.png', alt: 'Partner detail' },
];

function mountStaggeredMenu() {
  const el = document.getElementById('dalton-staggered-menu');
  if (!el) return;
  createRoot(el).render(
    <StaggeredMenu
      isFixed
      position="right"
      items={MENU_ITEMS}
      displaySocials={false}
      displayItemNumbering
      logoUrl="/showcase/dalton_logo.png"
      colors={['#C8A84B', '#0A0A0A', '#1a1a1a']}
      menuButtonColor="#D4D0C8"
      openMenuButtonColor="#0A0A0A"
      accentColor="#C8A84B"
      changeMenuColorOnOpen
    />,
  );
}

function mountScreenshotCarousel() {
  const el = document.getElementById('dalton-card-swap');
  if (!el) return;
  createRoot(el).render(
    <ScreenshotCarousel images={SHOWCASE_IMAGES} intervalMs={3500} slideWidth={132} slideHeight={270} gap={20} />,
  );
}

function boot() {
  mountStaggeredMenu();
  mountScreenshotCarousel();
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', boot);
} else {
  boot();
}
