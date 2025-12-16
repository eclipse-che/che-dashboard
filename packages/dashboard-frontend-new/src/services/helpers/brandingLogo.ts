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
 * Converts dashboard logo with base64 data to a proper data URL.
 * Handles SVG images specially to ensure crisp rendering.
 *
 * @param dashboardLogo - Logo object with base64data and mediatype
 * @param fallbackLogo - Fallback logo path if dashboardLogo is undefined
 * @returns Data URL string for use in img src or Brand component
 */
export function buildLogoSrc(
  dashboardLogo: { base64data: string; mediatype: string } | undefined,
  fallbackLogo: string,
): string {
  if (dashboardLogo === undefined) {
    return fallbackLogo;
  }

  // Special handling for SVG to ensure crisp rendering
  // SVG images render better when decoded and URI-encoded rather than base64
  if (dashboardLogo.mediatype === 'image/svg+xml') {
    try {
      const decodedSvg = atob(dashboardLogo.base64data);
      return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(decodedSvg)}`;
    } catch (e) {
      console.error('Failed to decode SVG logo, falling back to base64:', e);
      // Fallback to base64 if decoding fails
      return `data:${dashboardLogo.mediatype};base64,${dashboardLogo.base64data}`;
    }
  }

  // For non-SVG formats (PNG, JPEG, etc.), use base64 as-is
  return `data:${dashboardLogo.mediatype};base64,${dashboardLogo.base64data}`;
}
