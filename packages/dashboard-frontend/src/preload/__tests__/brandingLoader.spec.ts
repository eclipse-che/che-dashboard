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

describe('brandingLoader', () => {
  // These keys must match the constants in brandingLoader.ts and SessionStorageKey enum
  const BRANDING_LOGO_PATH_KEY = 'branding-logo-path';
  const BRANDING_FAVICON_KEY = 'branding-favicon';

  let mockSessionStorage: Record<string, string>;
  let mockFetch: jest.Mock;
  let mockImgElement: { src: string };
  let mockFaviconElement: { setAttribute: jest.Mock };
  let mockQuerySelector: jest.Mock;

  beforeEach(() => {
    // Reset mocks
    mockSessionStorage = {};
    mockImgElement = { src: '' };
    mockFaviconElement = { setAttribute: jest.fn() };

    // Mock sessionStorage directly on window
    Object.defineProperty(window, 'sessionStorage', {
      value: {
        getItem: jest.fn((key: string) => mockSessionStorage[key] || null),
        setItem: jest.fn((key: string, value: string) => {
          mockSessionStorage[key] = value;
        }),
        removeItem: jest.fn((key: string) => {
          delete mockSessionStorage[key];
        }),
      },
      writable: true,
    });

    // Mock fetch
    mockFetch = jest.fn();
    global.fetch = mockFetch;

    // Mock document.querySelector to return appropriate elements based on selector
    mockQuerySelector = jest.fn().mockImplementation((selector: string) => {
      if (selector === '.ide-page-loader-content img') {
        return mockImgElement;
      }
      if (selector === 'link[rel="shortcut icon"]') {
        return mockFaviconElement;
      }
      return null;
    });
    Object.defineProperty(document, 'querySelector', {
      value: mockQuerySelector,
      writable: true,
    });

    // Mock document.readyState
    Object.defineProperty(document, 'readyState', {
      value: 'complete',
      writable: true,
    });

    // Reset modules to reload brandingLoader
    jest.resetModules();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('logo loading with cache', () => {
    it('should use cached logo path if available', async () => {
      mockSessionStorage[BRANDING_LOGO_PATH_KEY] = '/dashboard/assets/branding/loader.png';

      // Import module to trigger initialization
      await import('../brandingLoader');

      // Should not make any fetch requests
      expect(mockFetch).not.toHaveBeenCalled();

      // Should set the cached path
      expect(mockImgElement.src).toBe('/dashboard/assets/branding/loader.png');
    });

    it('should detect format with parallel requests and cache when found', async () => {
      // Mock fetch to return 404 for jpg, jpeg, png and 200 for gif (and svg)
      mockFetch.mockImplementation((url: string) => {
        if (url.includes('loader.gif')) {
          return Promise.resolve({ ok: true });
        }
        if (url.includes('loader.svg')) {
          return Promise.resolve({ ok: true });
        }
        return Promise.resolve({ ok: false });
      });

      // Import module to trigger initialization
      await import('../brandingLoader');

      // Wait for async operations
      await new Promise(resolve => setTimeout(resolve, 50));

      // Should have sent parallel requests for all formats including svg
      expect(mockFetch).toHaveBeenCalledWith('/dashboard/assets/branding/loader.jpg', {
        method: 'HEAD',
      });
      expect(mockFetch).toHaveBeenCalledWith('/dashboard/assets/branding/loader.jpeg', {
        method: 'HEAD',
      });
      expect(mockFetch).toHaveBeenCalledWith('/dashboard/assets/branding/loader.png', {
        method: 'HEAD',
      });
      expect(mockFetch).toHaveBeenCalledWith('/dashboard/assets/branding/loader.gif', {
        method: 'HEAD',
      });
      expect(mockFetch).toHaveBeenCalledWith('/dashboard/assets/branding/loader.webp', {
        method: 'HEAD',
      });
      expect(mockFetch).toHaveBeenCalledWith('/dashboard/assets/branding/loader.svg', {
        method: 'HEAD',
      });

      // Should have cached the successful path (gif comes before svg in priority order)
      expect(mockSessionStorage[BRANDING_LOGO_PATH_KEY]).toBe(
        '/dashboard/assets/branding/loader.gif',
      );

      // Should have set the src
      expect(mockImgElement.src).toBe('/dashboard/assets/branding/loader.gif');
    });

    it('should use SVG when no other format is found (all checked in parallel)', async () => {
      // Mock fetch to return 404 for all formats except svg
      mockFetch.mockImplementation((url: string) => {
        if (url.includes('loader.svg')) {
          return Promise.resolve({ ok: true });
        }
        return Promise.resolve({ ok: false });
      });

      // Import module to trigger initialization
      await import('../brandingLoader');

      // Wait for async operations
      await new Promise(resolve => setTimeout(resolve, 50));

      // Should have checked all formats in parallel including SVG
      expect(mockFetch).toHaveBeenCalledWith('/dashboard/assets/branding/loader.svg', {
        method: 'HEAD',
      });

      // Should have cached the SVG path
      expect(mockSessionStorage[BRANDING_LOGO_PATH_KEY]).toBe(
        '/dashboard/assets/branding/loader.svg',
      );

      // Should have set the src to SVG
      expect(mockImgElement.src).toBe('/dashboard/assets/branding/loader.svg');
    });

    it('should not make requests when image element is not found', async () => {
      mockQuerySelector.mockImplementation((selector: string) => {
        if (selector === 'link[rel="shortcut icon"]') {
          return mockFaviconElement;
        }
        return null;
      });

      // Import module to trigger initialization
      await import('../brandingLoader');

      // Wait for async operations
      await new Promise(resolve => setTimeout(resolve, 50));

      // Should not make any fetch requests for logo
      expect(mockFetch).not.toHaveBeenCalled();
    });
  });

  describe('favicon loading with cache', () => {
    it('should load cached favicon immediately', async () => {
      const cachedHref = 'data:image/png;base64,testdata';
      mockSessionStorage[BRANDING_FAVICON_KEY] = cachedHref;

      // Import module to trigger initialization
      await import('../brandingLoader');

      // Should have updated favicon element
      expect(mockFaviconElement.setAttribute).toHaveBeenCalledWith('href', cachedHref);
    });

    it('should not update favicon if no cache exists', async () => {
      // Import module to trigger initialization
      await import('../brandingLoader');

      // Should not have updated favicon element (from cached source)
      expect(mockFaviconElement.setAttribute).not.toHaveBeenCalled();
    });
  });

  describe('updateFavicon export', () => {
    it('should cache and update favicon when dashboardFavicon is provided', async () => {
      const { updateFavicon } = await import('../brandingLoader');

      await updateFavicon({ base64data: 'base64data', mediatype: 'image/png' });

      // Should cache the favicon
      expect(mockSessionStorage[BRANDING_FAVICON_KEY]).toBe('data:image/png;base64,base64data');

      // Should update favicon element
      expect(mockFaviconElement.setAttribute).toHaveBeenCalledWith(
        'href',
        'data:image/png;base64,base64data',
      );
    });

    it('should fetch default favicon.ico when dashboardFavicon is undefined', async () => {
      const mockBlob = new Blob(['test'], { type: 'image/x-icon' });
      const mockDataUrl = 'data:image/x-icon;base64,dGVzdA==';

      mockFetch.mockResolvedValue({
        ok: true,
        blob: () => Promise.resolve(mockBlob),
      });

      // Mock FileReader
      const mockFileReader = {
        readAsDataURL: jest.fn(),
        onloadend: null as (() => void) | null,
        result: mockDataUrl,
      };
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (global as any).FileReader = jest.fn(() => mockFileReader);

      const { updateFavicon } = await import('../brandingLoader');

      const updatePromise = updateFavicon(undefined);

      // Wait for fetch to be called
      await new Promise(resolve => setTimeout(resolve, 10));

      // Trigger FileReader onloadend
      if (mockFileReader.onloadend) {
        mockFileReader.onloadend();
      }

      await updatePromise;

      // Should have fetched favicon.ico
      expect(mockFetch).toHaveBeenCalledWith('/dashboard/assets/branding/favicon.ico');

      // Should cache the fetched favicon
      expect(mockSessionStorage[BRANDING_FAVICON_KEY]).toBe(mockDataUrl);

      // Should update favicon element
      expect(mockFaviconElement.setAttribute).toHaveBeenCalledWith('href', mockDataUrl);
    });

    it('should not update favicon when fetch fails and dashboardFavicon is undefined', async () => {
      mockFetch.mockResolvedValue({
        ok: false,
      });

      const { updateFavicon } = await import('../brandingLoader');

      await updateFavicon(undefined);

      // Should have tried to fetch favicon.ico
      expect(mockFetch).toHaveBeenCalledWith('/dashboard/assets/branding/favicon.ico');

      // Should not cache or update anything
      expect(mockSessionStorage[BRANDING_FAVICON_KEY]).toBeUndefined();
      expect(mockFaviconElement.setAttribute).not.toHaveBeenCalled();
    });
  });
});
