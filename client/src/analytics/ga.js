// Google Analytics 4 integration.
// Loads gtag.js only when a measurement ID is configured (VITE_GA_MEASUREMENT_ID),
// so development and CI never ship analytics. Exposes helpers to track SPA page
// views and custom engagement events.

const MEASUREMENT_ID = import.meta.env.VITE_GA_MEASUREMENT_ID;
let initialized = false;

export function initAnalytics() {
  if (initialized || !MEASUREMENT_ID || typeof window === 'undefined') return;
  initialized = true;

  const script = document.createElement('script');
  script.async = true;
  script.src = `https://www.googletagmanager.com/gtag/js?id=${MEASUREMENT_ID}`;
  document.head.appendChild(script);

  window.dataLayer = window.dataLayer || [];
  // eslint-disable-next-line prefer-rest-params
  window.gtag = function gtag() { window.dataLayer.push(arguments); };
  window.gtag('js', new Date());
  // Manual page_view control for the SPA router.
  window.gtag('config', MEASUREMENT_ID, { send_page_view: false });
}

export function trackPageView(path) {
  if (!initialized || !window.gtag) return;
  window.gtag('event', 'page_view', { page_path: path, page_location: window.location.href });
}

export function trackEvent(name, params = {}) {
  if (!initialized || !window.gtag) return;
  window.gtag('event', name, params);
}

export const analyticsEnabled = Boolean(MEASUREMENT_ID);
