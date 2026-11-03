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

import { renderHook, waitFor } from '@testing-library/react';

import { BrandingState, useBranding } from '@/hooks/useBranding';
import { BRANDING_ASSETS_PATH, DEFAULT_BRANDING } from '@/services/branding';

const THEMED_SVG =
  '<svg xmlns="http://www.w3.org/2000/svg"><path class="outer-fill" d="M0 0"/></svg>';

/** Answers `product.json` and the logo file; 404s everything else. */
function stubFetch(product: Record<string, string>, logo?: string): jest.Mock {
  const mock = jest.fn((url: string) => {
    if (url.endsWith('product.json')) {
      return Promise.resolve({ ok: true, json: () => Promise.resolve(product) } as Response);
    }
    if (logo !== undefined && url.startsWith(BRANDING_ASSETS_PATH)) {
      return Promise.resolve({ ok: true, text: () => Promise.resolve(logo) } as Response);
    }
    return Promise.resolve({ ok: false, status: 404 } as Response);
  });
  window.fetch = mock as unknown as typeof window.fetch;
  return mock;
}

/** The decoded SVG behind a `data:image/svg+xml;charset=utf-8,...` URL. */
function decodeDataUrl(dataUrl: string): string {
  return decodeURIComponent(dataUrl.replace('data:image/svg+xml;charset=utf-8,', ''));
}

/** The whole hook result for the default product, with the given overrides. */
function expected(overrides: Partial<BrandingState> = {}): BrandingState {
  return {
    title: DEFAULT_BRANDING.title,
    name: DEFAULT_BRANDING.name,
    links: DEFAULT_BRANDING.links,
    productVersion: undefined,
    logoSrc: '',
    ...overrides,
  };
}

describe('useBranding', () => {
  beforeEach(() => {
    window.sessionStorage.clear();
  });

  it('starts without a logo so none is shown wrongly themed', async () => {
    stubFetch({});

    const { result } = renderHook(() => useBranding(false));
    expect(result.current).toEqual(expected());

    await waitFor(() => expect(result.current.logoSrc).not.toEqual(''));
  });

  it('resolves the product title and the logo of the dashboard', async () => {
    stubFetch({ title: 'Dev Spaces', logoFile: 'dev-spaces.png' });

    const { result } = renderHook(() => useBranding(false));

    await waitFor(() =>
      expect(result.current).toEqual(
        expected({ title: 'Dev Spaces', logoSrc: `${BRANDING_ASSETS_PATH}dev-spaces.png` }),
      ),
    );
  });

  describe('the product version', () => {
    it('asks the server when the product pins none', async () => {
      window.fetch = jest.fn((url: string, init?: RequestInit) =>
        init?.method === 'OPTIONS'
          ? Promise.resolve({
              ok: true,
              json: () => Promise.resolve({ implementationVersion: '7.104.0' }),
            } as Response)
          : Promise.resolve({ ok: false, status: 404 } as Response),
      ) as unknown as typeof window.fetch;

      const { result } = renderHook(() => useBranding(false));

      await waitFor(() => expect(result.current.productVersion).toBe('7.104.0'));
    });

    it('leaves the pinned version alone, and asks nothing', async () => {
      const mock = stubFetch({ productVersion: '3.21' });

      const { result } = renderHook(() => useBranding(false));

      await waitFor(() => expect(result.current.productVersion).toBe('3.21'));
      expect(mock).not.toHaveBeenCalledWith('/api/', expect.anything());
    });
  });

  it('re-themes the logo when the dashboard theme changes', async () => {
    stubFetch({}, THEMED_SVG);

    const { result, rerender } = renderHook(({ isDark }) => useBranding(isDark), {
      initialProps: { isDark: false },
    });
    await waitFor(() => expect(result.current.logoSrc).not.toEqual(''));
    expect(decodeDataUrl(result.current.logoSrc)).toContain('fill: #151515');

    rerender({ isDark: true });

    await waitFor(() => expect(decodeDataUrl(result.current.logoSrc)).toContain('fill: #ffffff'));
  });

  it('prefers the logo an administrator set on the CheCluster', async () => {
    window.fetch = jest.fn((url: string) =>
      url === '/dashboard/api/server-config'
        ? Promise.resolve({
            ok: true,
            json: () =>
              Promise.resolve({ dashboardLogo: { base64data: 'AAAA', mediatype: 'image/png' } }),
          } as Response)
        : Promise.resolve({ ok: false, status: 404 } as Response),
    ) as unknown as typeof window.fetch;

    const { result } = renderHook(() => useBranding(false));

    await waitFor(() => expect(result.current.logoSrc).toEqual('data:image/png;base64,AAAA'));
  });

  it('does not report branding resolved after unmount', async () => {
    stubFetch({ title: 'Dev Spaces' });

    const { result, unmount } = renderHook(() => useBranding(false));
    unmount();

    await waitFor(() => expect(window.fetch).toHaveBeenCalled());
    expect(result.current.logoSrc).toEqual('');
  });
});
