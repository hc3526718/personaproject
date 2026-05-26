import { createRoot } from 'react-dom/client';
import StaggeredMenu from './StaggeredMenu';
import ScreenshotCarousel from './ScreenshotCarousel';
import LandingAuth from './LandingAuth';
import './StaggeredMenu.css';
import './ScreenshotCarousel.css';

const MENU_ITEMS = [
  { label: 'Home', ariaLabel: 'Go to home page', link: '/' },
  { label: 'Features', ariaLabel: 'View features', link: '/features' },
  { label: 'Help', ariaLabel: 'Help centre', link: '/help-center' },
  { label: 'Contact', ariaLabel: 'Contact us', link: '/contact-us' },
];

/** Staggered gold shades for menu open transition layers */
const MENU_LAYER_COLORS = ['#4A3D18', '#8B7332', '#C8A84B', '#E8D5A3'];

const SHOWCASE_IMAGES = [
  { src: '/showcase/01.png', alt: 'Community — speak with the community' },
  { src: '/showcase/02.png', alt: 'Messaging — verified coach insights' },
  { src: '/showcase/03.png', alt: 'Events — book coached events' },
  { src: '/showcase/04.png', alt: 'Sponsors — partner with Dalton and beyond' },
  { src: '/showcase/05.png', alt: 'Media — training and podcast series' },
];

function mountStaggeredMenu() {
  const el = document.getElementById('dalton-staggered-menu');
  if (!el) return;
  createRoot(el).render(
    <StaggeredMenu
      isFixed
      position="left"
      items={MENU_ITEMS}
      displaySocials={false}
      displayItemNumbering
      logoUrl="/showcase/dalton_logo.png"
      colors={MENU_LAYER_COLORS}
      menuButtonColor="#FFFFFF"
      openMenuButtonColor="#FFFFFF"
      accentColor="#C8A84B"
      changeMenuColorOnOpen={false}
      hamburgerOnly
      headerEnd={<LandingAuth />}
    />,
  );
}

function mountScreenshotCarousel() {
  const el = document.getElementById('dalton-card-swap');
  if (!el) return;
  createRoot(el).render(<ScreenshotCarousel images={SHOWCASE_IMAGES} intervalMs={4500} />);
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
