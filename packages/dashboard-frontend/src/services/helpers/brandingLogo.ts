/*
 * Copyright (c) 2018-2026 Red Hat, Inc.
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
 * Session storage key for cached SVG logos with theme variants.
 */
const BRANDING_LOGO_SVG_CACHE_KEY = 'branding-logo-svg-cache';

/**
 * Cache structure for storing SVG content with theme variants.
 */
interface SvgCache {
  [url: string]: {
    original: string;
    light?: string;
    dark?: string;
  };
}

/**
 * Gets SVG cache from session storage.
 */
function getSvgCache(): SvgCache {
  try {
    const cached = window.sessionStorage.getItem(BRANDING_LOGO_SVG_CACHE_KEY);
    return cached ? JSON.parse(cached) : {};
  } catch {
    return {};
  }
}

/**
 * Sets SVG cache in session storage.
 */
function setSvgCache(cache: SvgCache): void {
  try {
    window.sessionStorage.setItem(BRANDING_LOGO_SVG_CACHE_KEY, JSON.stringify(cache));
  } catch {
    // Silently ignore storage errors
  }
}

/**
 * Fetches SVG content from a URL.
 * Uses session storage cache to avoid repeated requests.
 */
async function fetchSvgContent(url: string): Promise<string | null> {
  const cache = getSvgCache();

  // Check cache first
  if (cache[url]?.original) {
    return cache[url].original;
  }

  try {
    const response = await fetch(url);
    if (!response.ok) {
      return null;
    }
    const rawContent = await response.text();
    // Sanitize before caching to strip scripts/event-handlers
    const svgContent = sanitizeSvg(rawContent);

    // Cache the sanitized SVG content
    cache[url] = { original: svgContent };
    setSvgCache(cache);

    return svgContent;
  } catch {
    return null;
  }
}

/**
 * Sanitizes SVG content by removing script elements and dangerous attributes.
 * Prevents XSS from externally-fetched SVG content.
 */
function sanitizeSvg(svgContent: string): string {
  try {
    const parser = new DOMParser();
    const doc = parser.parseFromString(svgContent, 'image/svg+xml');

    // Remove all <script> elements
    doc.querySelectorAll('script').forEach(el => el.remove());

    // Remove all elements with xlink:href or href pointing to javascript:
    doc.querySelectorAll('[href],[xlink\\:href]').forEach(el => {
      const href =
        el.getAttribute('href') || el.getAttributeNS('http://www.w3.org/1999/xlink', 'href');
      if (href && /^\s*javascript:/i.test(href)) {
        el.remove();
      }
    });

    // Remove all on* event handler attributes from every element
    doc.querySelectorAll('*').forEach(el => {
      Array.from(el.attributes).forEach(attr => {
        if (/^on/i.test(attr.name)) {
          el.removeAttribute(attr.name);
        }
      });
    });

    return new XMLSerializer().serializeToString(doc);
  } catch {
    // If sanitization fails, return empty SVG rather than potentially unsafe content
    return '<svg xmlns="http://www.w3.org/2000/svg"/>';
  }
}

/**
 * Resolves the fill color for .outer-fill elements from the active PF6 theme token.
 * Falls back to hardcoded PF6 defaults when CSS variables are unavailable (e.g. tests, SSR).
 *
 * Token used: --pf-t--global--text--color--regular
 *   Light theme → dark text  (~#151515)
 *   Dark theme  → light text (~#ffffff)
 */
function resolveOuterFillColor(isDarkTheme: boolean): string {
  try {
    const color = getComputedStyle(document.documentElement)
      .getPropertyValue('--pf-t--global--text--color--regular')
      .trim();
    if (color) {
      return color;
    }
  } catch {
    // Unavailable in SSR or test environments — fall through to defaults
  }
  return isDarkTheme ? '#ffffff' : '#151515';
}

/**
 * Applies theme-aware color to .outer-fill SVG elements via an injected CSS rule.
 *
 * Uses a <style> block inside the SVG rather than mutating fill attributes directly.
 * This CSS-based approach works correctly when the SVG is loaded via an <img> src
 * (data URL), because the style is embedded within the SVG document itself.
 *
 * @param svgContent - Original SVG content as string
 * @param isDarkTheme - Whether dark theme is active
 * @returns Modified SVG content with an injected <style> for .outer-fill
 */
function applyThemeToSvg(svgContent: string, isDarkTheme: boolean): string {
  try {
    const parser = new DOMParser();
    const svgDoc = parser.parseFromString(svgContent, 'image/svg+xml');

    if (svgDoc.querySelectorAll('.outer-fill').length === 0) {
      return svgContent;
    }

    const fillColor = resolveOuterFillColor(isDarkTheme);

    // Inject (or replace) a <style> block with the resolved color.
    // Using a CSS rule keeps theming declarative and avoids per-element attribute mutation.
    let styleEl = svgDoc.querySelector('style[data-che-theme]');
    if (!styleEl) {
      styleEl = svgDoc.createElementNS('http://www.w3.org/2000/svg', 'style');
      styleEl.setAttribute('data-che-theme', 'true');
      svgDoc.documentElement.insertBefore(styleEl, svgDoc.documentElement.firstChild);
    }
    styleEl.textContent = `.outer-fill { fill: ${fillColor}; }`;

    return new XMLSerializer().serializeToString(svgDoc);
  } catch (e) {
    console.error('Failed to apply theme to SVG:', e);
    return svgContent;
  }
}

/**
 * Processes SVG logo with theme-aware color transformation.
 * Fetches, caches, and applies theme-specific colors to SVG logos.
 *
 * @param logoUrl - URL to the SVG logo
 * @param isDarkTheme - Whether dark theme is active
 * @returns Data URL with theme-modified SVG or null if fetch fails
 */
async function processSvgLogo(logoUrl: string, isDarkTheme: boolean): Promise<string | null> {
  const cache = getSvgCache();
  const themeKey = isDarkTheme ? 'dark' : 'light';

  // Check if we have a cached themed version
  if (cache[logoUrl]?.[themeKey]) {
    return cache[logoUrl][themeKey]!;
  }

  // Fetch original SVG content (will use cache if available)
  const svgContent = await fetchSvgContent(logoUrl);
  if (!svgContent) {
    return null;
  }

  // Apply theme transformation
  const themedSvg = applyThemeToSvg(svgContent, isDarkTheme);

  // Create data URL
  const dataUrl = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(themedSvg)}`;

  // Cache the themed version
  if (!cache[logoUrl]) {
    cache[logoUrl] = { original: svgContent };
  }
  cache[logoUrl][themeKey] = dataUrl;
  setSvgCache(cache);

  return dataUrl;
}

/**
 * Converts dashboard logo with base64 data to a proper data URL.
 * Handles SVG images specially to ensure crisp rendering and theme-aware colors.
 *
 * @param dashboardLogo - Logo object with base64data and mediatype
 * @param fallbackLogo - Fallback logo path if dashboardLogo is undefined
 * @param isDarkTheme - Whether dark theme is active (default: false)
 * @returns Data URL string for use in img src or Brand component, or a Promise if SVG needs fetching
 */
export function buildLogoSrc(
  dashboardLogo: { base64data: string; mediatype: string } | undefined,
  fallbackLogo: string,
  isDarkTheme: boolean = false,
): string | Promise<string> {
  // Handle fallback logo when no custom dashboard logo is provided
  if (dashboardLogo === undefined) {
    // Check if fallback is an SVG file
    if (fallbackLogo && fallbackLogo.toLowerCase().endsWith('.svg')) {
      // Return a Promise that fetches and processes the SVG
      return processSvgLogo(fallbackLogo, isDarkTheme).then(dataUrl => dataUrl || fallbackLogo);
    }
    return fallbackLogo || '';
  }

  // Special handling for SVG to ensure crisp rendering
  // SVG images render better when decoded and URI-encoded rather than base64
  if (dashboardLogo.mediatype === 'image/svg+xml') {
    try {
      const decodedSvg = atob(dashboardLogo.base64data);
      // Sanitize and apply theme transformation to custom SVG logos
      const sanitizedSvg = sanitizeSvg(decodedSvg);
      const themedSvg = applyThemeToSvg(sanitizedSvg, isDarkTheme);
      return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(themedSvg)}`;
    } catch (e) {
      console.error('Failed to decode SVG logo, falling back to base64:', e);
      // Fallback to base64 if decoding fails
      return `data:${dashboardLogo.mediatype};base64,${dashboardLogo.base64data}`;
    }
  }

  // For non-SVG formats (PNG, JPEG, etc.), use base64 as-is
  return `data:${dashboardLogo.mediatype};base64,${dashboardLogo.base64data}`;
}
