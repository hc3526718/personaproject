/**
 * Legacy PNG splash asset — prefer `BrandLogo` + `assets/Main_Logo.svg` for UI chrome.
 * Kept for static HTML parity / fallback where SVG is not used.
 */
export const BRAND_LOGO_PNG = require('../../assets/output-onlinetools (15).png');

/** @deprecated Use `BrandLogo` component from `src/components/BrandLogo.tsx`. */
export const BRAND_LOGO = BRAND_LOGO_PNG;
