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
 * Resolves the masthead logo the same way the dashboard does, so the two
 * applications look like one product.
 *
 * Agent Space is served from the dashboard's origin, which means it can read
 * the dashboard's own branding assets and - importantly - share its session
 * storage. The cache key and the entry shape below are deliberately identical
 * to the dashboard's `services/helpers/brandingLogo.ts`, so whichever
 * application loads first warms the cache for the other.
 */

/** Must stay in step with the dashboard's `preload/brandingLoader.ts`. */
export const BRANDING_ASSETS_PATH = '/dashboard/assets/branding/';

/** Must stay in step with the dashboard's `services/helpers/brandingLogo.ts`. */
export const BRANDING_LOGO_SVG_CACHE_KEY = 'branding-logo-svg-cache';

const SERVER_CONFIG_URL = '/dashboard/api/server-config';

/** Che server endpoint whose OPTIONS response carries the product version. */
const CHE_API_URL = '/api/';

export interface BrandingLink {
  text: string;
  href: string;
}

export interface Branding {
  title: string;
  /** Product name, shown in the About dialog. */
  name: string;
  logoFile: string;
  /** Help links listed above "About" in the About menu. */
  links: BrandingLink[];
  /** Set only when `product.json` pins it; otherwise the server is asked. */
  productVersion?: string;
}

/** The dashboard's own defaults, used when `product.json` overrides nothing. */
export const DEFAULT_BRANDING: Branding = {
  title: 'Eclipse Che',
  name: 'Eclipse Che',
  logoFile: 'che-logo.svg',
  links: [
    {
      text: 'Make a wish',
      href: 'mailto:che-dev@eclipse.org',
    },
    {
      text: 'Documentation',
      href: 'https://www.eclipse.org/che/docs/stable/overview/introduction-to-eclipse-che/',
    },
    {
      text: 'Community',
      href: 'https://www.eclipse.org/che/',
    },
  ],
};

interface DashboardLogo {
  base64data: string;
  mediatype: string;
}

interface SvgCacheEntry {
  original: string;
  light?: string;
  dark?: string;
}

interface SvgCache {
  [url: string]: SvgCacheEntry;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function getSvgCache(): SvgCache {
  try {
    const cached = window.sessionStorage.getItem(BRANDING_LOGO_SVG_CACHE_KEY);
    return cached ? JSON.parse(cached) : {};
  } catch {
    return {};
  }
}

function setSvgCache(cache: SvgCache): void {
  try {
    window.sessionStorage.setItem(BRANDING_LOGO_SVG_CACHE_KEY, JSON.stringify(cache));
  } catch {
    // Silently ignore storage errors
  }
}

/**
 * Strips scripts and event handlers from SVG content fetched at runtime.
 */
export function sanitizeSvg(svgContent: string): string {
  try {
    const doc = new DOMParser().parseFromString(svgContent, 'image/svg+xml');

    doc.querySelectorAll('script').forEach(el => el.remove());

    doc.querySelectorAll('[href],[xlink\\:href]').forEach(el => {
      const href =
        el.getAttribute('href') || el.getAttributeNS('http://www.w3.org/1999/xlink', 'href');
      if (href && /^\s*javascript:/i.test(href)) {
        el.remove();
      }
    });

    doc.querySelectorAll('*').forEach(el => {
      Array.from(el.attributes).forEach(attr => {
        if (/^on/i.test(attr.name)) {
          el.removeAttribute(attr.name);
        }
      });
    });

    return new XMLSerializer().serializeToString(doc);
  } catch {
    // Rather an empty image than content that could not be checked.
    return '<svg xmlns="http://www.w3.org/2000/svg"/>';
  }
}

/**
 * Reads the regular text color of the active PatternFly theme, which is what
 * the logo's `.outer-fill` parts are painted with.
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
    // Unavailable in test environments - fall through to the defaults
  }
  return isDarkTheme ? '#ffffff' : '#151515';
}

/**
 * Colors the `.outer-fill` parts of the logo for the active theme.
 *
 * The rule is injected as a `<style>` inside the SVG instead of being written
 * onto each element, because the logo is rendered through an `<img>` and only
 * styles carried by the SVG document itself apply there.
 */
export function applyThemeToSvg(svgContent: string, isDarkTheme: boolean): string {
  try {
    const svgDoc = new DOMParser().parseFromString(svgContent, 'image/svg+xml');

    if (svgDoc.querySelectorAll('.outer-fill').length === 0) {
      return svgContent;
    }

    let styleEl = svgDoc.querySelector('style[data-che-theme]');
    if (!styleEl) {
      styleEl = svgDoc.createElementNS('http://www.w3.org/2000/svg', 'style');
      styleEl.setAttribute('data-che-theme', 'true');
      svgDoc.documentElement.insertBefore(styleEl, svgDoc.documentElement.firstChild);
    }
    styleEl.textContent = `.outer-fill { fill: ${resolveOuterFillColor(isDarkTheme)}; }`;

    return new XMLSerializer().serializeToString(svgDoc);
  } catch {
    return svgContent;
  }
}

async function fetchSvgContent(url: string): Promise<string | null> {
  const cache = getSvgCache();
  if (cache[url]?.original) {
    return cache[url].original;
  }

  try {
    const response = await fetch(url);
    if (!response.ok) {
      return null;
    }
    // Sanitize before caching, so nothing unchecked is ever stored.
    const svgContent = sanitizeSvg(await response.text());

    cache[url] = { original: svgContent };
    setSvgCache(cache);

    return svgContent;
  } catch {
    return null;
  }
}

async function processSvgLogo(logoUrl: string, isDarkTheme: boolean): Promise<string | null> {
  const cache = getSvgCache();
  const themeKey = isDarkTheme ? 'dark' : 'light';

  const cached = cache[logoUrl]?.[themeKey];
  if (cached) {
    return cached;
  }

  const svgContent = await fetchSvgContent(logoUrl);
  if (!svgContent) {
    return null;
  }

  const dataUrl = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(
    applyThemeToSvg(svgContent, isDarkTheme),
  )}`;

  const toStore = getSvgCache();
  if (!toStore[logoUrl]) {
    toStore[logoUrl] = { original: svgContent };
  }
  toStore[logoUrl][themeKey] = dataUrl;
  setSvgCache(toStore);

  return dataUrl;
}

function parseLinks(value: unknown): BrandingLink[] {
  if (!Array.isArray(value)) {
    return DEFAULT_BRANDING.links;
  }
  const links = value.filter(
    (link): link is BrandingLink =>
      isRecord(link) && typeof link['text'] === 'string' && typeof link['href'] === 'string',
  );
  return links.length > 0 ? links : DEFAULT_BRANDING.links;
}

/**
 * Reads `product.json` from the dashboard's branding assets. Anything it does
 * not override keeps the dashboard's default.
 */
export async function fetchBranding(): Promise<Branding> {
  try {
    const response = await fetch(`${BRANDING_ASSETS_PATH}product.json`, { cache: 'no-cache' });
    if (!response.ok) {
      return { ...DEFAULT_BRANDING };
    }
    const raw: unknown = await response.json();
    if (!isRecord(raw)) {
      return { ...DEFAULT_BRANDING };
    }
    return {
      title: typeof raw['title'] === 'string' ? raw['title'] : DEFAULT_BRANDING.title,
      name: typeof raw['name'] === 'string' ? raw['name'] : DEFAULT_BRANDING.name,
      logoFile: typeof raw['logoFile'] === 'string' ? raw['logoFile'] : DEFAULT_BRANDING.logoFile,
      links: parseLinks(raw['links']),
      productVersion: typeof raw['productVersion'] === 'string' ? raw['productVersion'] : undefined,
    };
  } catch {
    // A standalone deployment has no dashboard assets next to it.
    return { ...DEFAULT_BRANDING };
  }
}

/**
 * Asks the Che server for its version, which the About dialog shows when
 * `product.json` does not pin one - the same fallback the dashboard uses.
 */
export async function fetchProductVersion(): Promise<string | undefined> {
  try {
    const response = await fetch(CHE_API_URL, { method: 'OPTIONS', cache: 'no-cache' });
    if (!response.ok) {
      return undefined;
    }
    const raw: unknown = await response.json();
    return isRecord(raw) && typeof raw['implementationVersion'] === 'string'
      ? raw['implementationVersion']
      : undefined;
  } catch {
    return undefined;
  }
}

/**
 * Reads the logo an administrator set on the CheCluster, which wins over the
 * bundled asset exactly as it does in the dashboard.
 */
export async function fetchDashboardLogo(): Promise<DashboardLogo | undefined> {
  try {
    const response = await fetch(SERVER_CONFIG_URL, { cache: 'no-cache' });
    if (!response.ok) {
      return undefined;
    }
    const raw: unknown = await response.json();
    if (!isRecord(raw) || !isRecord(raw['dashboardLogo'])) {
      return undefined;
    }
    const { base64data, mediatype } = raw['dashboardLogo'];
    return typeof base64data === 'string' && typeof mediatype === 'string'
      ? { base64data, mediatype }
      : undefined;
  } catch {
    return undefined;
  }
}

/**
 * Builds the `src` of the masthead logo, mirroring the dashboard's
 * `buildLogoSrc`: a custom logo from the CheCluster wins, otherwise the
 * branding asset is fetched, themed and cached.
 */
export async function buildLogoSrc(
  dashboardLogo: DashboardLogo | undefined,
  logoFile: string,
  isDarkTheme: boolean,
): Promise<string> {
  if (dashboardLogo === undefined) {
    const logoUrl = `${BRANDING_ASSETS_PATH}${logoFile}`;
    if (!logoFile.toLowerCase().endsWith('.svg')) {
      return logoUrl;
    }
    return (await processSvgLogo(logoUrl, isDarkTheme)) ?? logoUrl;
  }

  // SVG renders crisper as a URI-encoded document than as base64.
  if (dashboardLogo.mediatype === 'image/svg+xml') {
    try {
      const themed = applyThemeToSvg(sanitizeSvg(atob(dashboardLogo.base64data)), isDarkTheme);
      return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(themed)}`;
    } catch {
      return `data:${dashboardLogo.mediatype};base64,${dashboardLogo.base64data}`;
    }
  }

  return `data:${dashboardLogo.mediatype};base64,${dashboardLogo.base64data}`;
}
