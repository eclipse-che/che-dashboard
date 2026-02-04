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

// Mock fetch for testing SVG logo fetching
global.fetch = jest.fn();

// Mock sessionStorage
const mockSessionStorage = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => {
      store[key] = value;
    },
    removeItem: (key: string) => {
      delete store[key];
    },
    clear: () => {
      store = {};
    },
  };
})();

Object.defineProperty(window, 'sessionStorage', {
  value: mockSessionStorage,
});

describe('brandingLogo helper', () => {
  const fallbackLogo = './assets/branding/logo.png';
  const fallbackSvgLogo = './assets/branding/che-logo.svg';

  beforeEach(() => {
    jest.clearAllMocks();
    mockSessionStorage.clear();
  });

  describe('when dashboardLogo is undefined', () => {
    it('should return fallback logo for non-SVG files', () => {
      const result = buildLogoSrc(undefined, fallbackLogo);
      expect(result).toBe(fallbackLogo);
    });

    it('should return Promise for SVG fallback logos', async () => {
      const svgContent = '<svg><circle class="outer-fill" r="10"/></svg>';
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        text: async () => svgContent,
      });

      const result = buildLogoSrc(undefined, fallbackSvgLogo, false);

      expect(result).toBeInstanceOf(Promise);
      const logoSrc = await result;
      expect(logoSrc).toContain('data:image/svg+xml;charset=utf-8,');
      expect(fetch).toHaveBeenCalledWith(fallbackSvgLogo);
    });

    it('should cache SVG content in session storage', async () => {
      const svgContent = '<svg><circle r="10"/></svg>';
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        text: async () => svgContent,
      });

      // First call - should fetch
      await buildLogoSrc(undefined, fallbackSvgLogo, false);
      expect(fetch).toHaveBeenCalledTimes(1);

      // Second call - should use cache
      jest.clearAllMocks();
      await buildLogoSrc(undefined, fallbackSvgLogo, false);
      expect(fetch).not.toHaveBeenCalled();
    });

    it('should apply theme-specific colors to outer-fill elements (dark theme)', async () => {
      const svgContent =
        '<svg><circle class="outer-fill" fill="#000000" r="10"/><rect class="inner" fill="#ff0000"/></svg>';
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        text: async () => svgContent,
      });

      const result = await buildLogoSrc(undefined, fallbackSvgLogo, true);
      const encodedPart = result.replace('data:image/svg+xml;charset=utf-8,', '');
      const decoded = decodeURIComponent(encodedPart);

      expect(decoded).toContain('fill="#ffffff"'); // Dark theme color
      expect(decoded).toContain('class="outer-fill"');
    });

    it('should apply theme-specific colors to outer-fill elements (light theme)', async () => {
      const svgContent =
        '<svg><circle class="outer-fill" fill="#ffffff" r="10"/><rect class="inner" fill="#ff0000"/></svg>';
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        text: async () => svgContent,
      });

      const result = await buildLogoSrc(undefined, fallbackSvgLogo, false);
      const encodedPart = result.replace('data:image/svg+xml;charset=utf-8,', '');
      const decoded = decodeURIComponent(encodedPart);

      expect(decoded).toContain('fill="#151515"'); // Light theme color
      expect(decoded).toContain('class="outer-fill"');
    });

    it('should cache different theme variants separately', async () => {
      const svgContent = '<svg><circle class="outer-fill" fill="#000000" r="10"/></svg>';
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        text: async () => svgContent,
      });

      // Fetch dark theme version
      const darkResult = await buildLogoSrc(undefined, fallbackSvgLogo, true);
      expect(darkResult).toContain(encodeURIComponent('fill="#ffffff"'));

      // Fetch light theme version - should use cached original but generate new themed version
      jest.clearAllMocks();
      const lightResult = await buildLogoSrc(undefined, fallbackSvgLogo, false);
      expect(fetch).not.toHaveBeenCalled(); // Should use cached original
      expect(lightResult).toContain(encodeURIComponent('fill="#151515"'));
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

    it('should apply theme to custom SVG logos', () => {
      const svgContent = '<svg><circle class="outer-fill" fill="#000000" r="10"/></svg>';
      const base64Svg = btoa(svgContent);
      const dashboardLogo = {
        base64data: base64Svg,
        mediatype: 'image/svg+xml',
      };

      const result = buildLogoSrc(dashboardLogo, fallbackLogo, true) as string;
      const encodedPart = result.replace('data:image/svg+xml;charset=utf-8,', '');
      const decoded = decodeURIComponent(encodedPart);

      expect(decoded).toContain('fill="#ffffff"'); // Dark theme color
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

      const result = buildLogoSrc(dashboardLogo, fallbackLogo) as string;

      // Extract the encoded part
      const encodedPart = result.replace('data:image/svg+xml;charset=utf-8,', '');
      const decoded = decodeURIComponent(encodedPart);

      expect(decoded).toContain('svg'); // XML serializer might change format slightly
      expect(decoded).toContain('rect');
      expect(decoded).toContain('fill="red"');
    });
  });
});
