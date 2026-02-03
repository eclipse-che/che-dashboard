/*
 * Copyright (c) 2018-2025 Red Hat, Inc.
 * This program and the accompanying materials are made
 * available under the terms of the Eclipse Public License 2.0
 * which is available at https://www.eclipse.org/legal/epl-2.0/
 *
 * SPDX-License-Identifier: EPL-2.0
 *
 * Contributors:
 *   Red Hat, Inc. - initial API and implementation
 */

/**
 * Base path to the branding assets directory.
 * Used for loading the appropriate loader image format.
 */
const BRANDING_ASSETS_PATH = '/dashboard/assets/branding/';

/**
 * Session storage keys for branding assets.
 * These values are used for caching branding assets between page loads.
 */
const BRANDING_LOGO_PATH_KEY = 'branding-logo-path';
const BRANDING_FAVICON_KEY = 'branding-favicon';

/**
 * Image formats to check for logo, in priority order.
 * SVG is included last as the default fallback format.
 * All formats are checked in parallel for optimal performance.
 */
const IMAGE_FORMATS = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg'] as const;

/**
 * Gets a value from session storage.
 */
function getFromStorage(key: string): string | undefined {
  try {
    return window.sessionStorage.getItem(key) || undefined;
  } catch {
    return undefined;
  }
}

/**
 * Sets a value in session storage.
 */
function setToStorage(key: string, value: string): void {
  try {
    window.sessionStorage.setItem(key, value);
  } catch {
    // Silently ignore storage errors
  }
}

/**
 * Checks if an image format exists at the given path via HEAD request.
 * Returns the full path if successful, null otherwise.
 */
async function checkFormat(basePath: string, format: string): Promise<string | null> {
  try {
    const logoPath = `${basePath}loader.${format}`;
    const response = await fetch(logoPath, { method: 'HEAD' });
    if (response.ok) {
      return logoPath;
    }
  } catch {
    // Silently continue if fetch fails
  }
  return null;
}

/**
 * Dynamically loads the appropriate loader image based on availability.
 * Uses session storage cache to avoid repeated format detection on subsequent loads.
 * Sends parallel requests for all formats (including SVG) for optimal performance.
 *
 * @param basePath - The base path to the branding assets directory
 * @param selector - CSS selector for the image element (default: '.ide-page-loader-content img')
 */
function loadBrandingLogo(
  basePath: string,
  selector: string = '.ide-page-loader-content img',
): void {
  const imgElement = document.querySelector<HTMLImageElement>(selector);

  if (!imgElement) {
    return;
  }

  // Check for cached logo path first
  const cachedPath = getFromStorage(BRANDING_LOGO_PATH_KEY);
  if (cachedPath) {
    imgElement.src = cachedPath;
    return;
  }

  /**
   * Check all formats in parallel and use the first available one (by priority order).
   */
  async function detectAndLoadFormat(): Promise<void> {
    if (!imgElement) {
      return;
    }

    // Send all format requests in parallel (including SVG)
    const results = await Promise.all(IMAGE_FORMATS.map(format => checkFormat(basePath, format)));

    // Find the first successful format (maintains priority order, SVG is last)
    const foundPath = results.find(path => path !== null);

    if (foundPath) {
      imgElement.src = foundPath;
      setToStorage(BRANDING_LOGO_PATH_KEY, foundPath);
    }
  }

  detectAndLoadFormat();
}

/**
 * Loads the favicon from session storage cache if available.
 * This provides immediate favicon display on subsequent page loads.
 */
function loadCachedFavicon(): void {
  const cachedFavicon = getFromStorage(BRANDING_FAVICON_KEY);
  if (cachedFavicon) {
    updateFaviconElement(cachedFavicon);
  }
}

/**
 * Updates the favicon element with the provided href attribute.
 */
function updateFaviconElement(href: string): void {
  if (window.document) {
    const faviconElement = window.document.querySelector<HTMLLinkElement>(
      'link[rel="shortcut icon"]',
    );
    if (faviconElement) {
      faviconElement.setAttribute('href', href);
    }
  }
}

/**
 * Fetches the default favicon.ico and returns it as a data URL.
 */
async function fetchDefaultFavicon(): Promise<string | null> {
  try {
    const response = await fetch(`${BRANDING_ASSETS_PATH}favicon.ico`);
    if (!response.ok) {
      return null;
    }
    const blob = await response.blob();
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  } catch {
    return null;
  }
}

/**
 * Dashboard favicon type from cluster config.
 */
interface DashboardFavicon {
  base64data: string;
  mediatype: string;
}

/**
 * Updates and caches the favicon.
 * If dashboardFavicon is provided, uses it directly.
 * If undefined, fetches the default favicon.ico from branding assets.
 *
 * @param dashboardFavicon - Favicon data from cluster config, or undefined
 */
export async function updateFavicon(dashboardFavicon: DashboardFavicon | undefined): Promise<void> {
  let href: string;

  if (dashboardFavicon?.base64data && dashboardFavicon?.mediatype) {
    href = `data:${dashboardFavicon.mediatype};base64,${dashboardFavicon.base64data}`;
  } else {
    // Fetch default favicon.ico
    const dataUrl = await fetchDefaultFavicon();
    if (!dataUrl) {
      return;
    }
    href = dataUrl;
  }

  setToStorage(BRANDING_FAVICON_KEY, href);
  updateFaviconElement(href);
}

/**
 * Initializes the branding logo loader when the window is fully loaded.
 * This ensures the DOM is ready and the image element exists.
 * Also loads cached favicon immediately for fast display.
 */
function initBrandingLoader(basePath: string): void {
  // Load cached favicon immediately (before DOM fully loaded)
  loadCachedFavicon();

  if (document.readyState === 'loading') {
    window.addEventListener('load', () => {
      loadBrandingLogo(basePath);
    });
  } else {
    // DOM is already loaded, execute immediately
    loadBrandingLogo(basePath);
  }
}

// Initialize branding loader with the configured base path
initBrandingLoader(BRANDING_ASSETS_PATH);
