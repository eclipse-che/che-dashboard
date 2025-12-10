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

import { buildLogoSrc } from '@/services/helpers/brandingLogo';

describe('brandingLogo helper', () => {
  const fallbackLogo = './assets/branding/che-logo.svg';

  describe('when dashboardLogo is undefined', () => {
    it('should return fallback logo', () => {
      const result = buildLogoSrc(undefined, fallbackLogo);
      expect(result).toBe(fallbackLogo);
    });
  });

  describe('when dashboardLogo is SVG', () => {
    it('should decode base64 and encode with URI encoding', () => {
      const svgContent = '<svg><circle r="10"/></svg>';
      const base64Svg = btoa(svgContent);
      const dashboardLogo = {
        base64data: base64Svg,
        mediatype: 'image/svg+xml',
      };

      const result = buildLogoSrc(dashboardLogo, fallbackLogo);

      expect(result).toContain('data:image/svg+xml;charset=utf-8,');
      expect(result).toContain(encodeURIComponent(svgContent));
      expect(result).not.toContain('base64');
    });

    it('should fallback to base64 if decoding fails', () => {
      const invalidBase64 = 'invalid!!!base64';
      const dashboardLogo = {
        base64data: invalidBase64,
        mediatype: 'image/svg+xml',
      };

      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();

      const result = buildLogoSrc(dashboardLogo, fallbackLogo);

      expect(result).toBe(`data:image/svg+xml;base64,${invalidBase64}`);
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        'Failed to decode SVG logo, falling back to base64:',
        expect.any(Error),
      );

      consoleErrorSpy.mockRestore();
    });
  });

  describe('when dashboardLogo is PNG', () => {
    it('should return base64 data URL', () => {
      const base64data =
        'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
      const dashboardLogo = {
        base64data,
        mediatype: 'image/png',
      };

      const result = buildLogoSrc(dashboardLogo, fallbackLogo);

      expect(result).toBe(`data:image/png;base64,${base64data}`);
    });
  });

  describe('when dashboardLogo is JPEG', () => {
    it('should return base64 data URL', () => {
      const base64data =
        '/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAP//////////////////////////////////////////////////////////////////////////////////////wgALCAABAAEBAREA/8QAFAABAAAAAAAAAAAAAAAAAAAAA//aAAgBAQABPxA=';
      const dashboardLogo = {
        base64data,
        mediatype: 'image/jpeg',
      };

      const result = buildLogoSrc(dashboardLogo, fallbackLogo);

      expect(result).toBe(`data:image/jpeg;base64,${base64data}`);
    });
  });

  describe('SVG encoding quality', () => {
    it('should preserve SVG structure after encoding/decoding', () => {
      const svgContent =
        '<svg width="100" height="100"><rect x="10" y="10" width="80" height="80" fill="red"/></svg>';
      const base64Svg = btoa(svgContent);
      const dashboardLogo = {
        base64data: base64Svg,
        mediatype: 'image/svg+xml',
      };

      const result = buildLogoSrc(dashboardLogo, fallbackLogo);

      // Extract the encoded part
      const encodedPart = result.replace('data:image/svg+xml;charset=utf-8,', '');
      const decoded = decodeURIComponent(encodedPart);

      expect(decoded).toBe(svgContent);
    });
  });
});
