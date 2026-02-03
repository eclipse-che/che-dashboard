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
 * Dynamically loads the appropriate loader image based on availability.
 * Checks formats in priority order: jpg, jpeg, png, gif, webp, svg (fallback).
 * The SVG format is used as the default fallback if no other format is available.
 *
 * @param basePath - The base path to the branding assets directory
 * @param selector - CSS selector for the image element (default: '.ide-page-loader-content img')
 */
function loadBrandingLogo(
  basePath: string,
  selector: string = '.ide-page-loader-content img',
): void {
  const imageFormats = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg'] as const;
  const imgElement = document.querySelector<HTMLImageElement>(selector);

  if (!imgElement) {
    return;
  }

  /**
   * Attempts to load an image format by checking if it exists via HEAD request.
   * If successful, updates the image source and stops further checks.
   */
  async function tryLoadFormat(format: string): Promise<boolean> {
    if (!imgElement) {
      return false;
    }
    try {
      const response = await fetch(`${basePath}loader.${format}`, { method: 'HEAD' });
      if (response.ok) {
        imgElement.src = `${basePath}loader.${format}`;
        return true;
      }
    } catch {
      // Silently continue to next format if fetch fails
    }
    return false;
  }

  /**
   * Iterates through all formats and loads the first available one.
   * SVG is guaranteed to be checked as the last fallback.
   */
  async function loadFirstAvailable(): Promise<void> {
    for (const format of imageFormats) {
      const loaded = await tryLoadFormat(format);
      if (loaded) {
        return;
      }
    }
  }

  loadFirstAvailable();
}

/**
 * Initializes the branding logo loader when the window is fully loaded.
 * This ensures the DOM is ready and the image element exists.
 */
function initBrandingLoader(basePath: string): void {
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
