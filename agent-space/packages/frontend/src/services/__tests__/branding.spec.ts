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

import {
  applyThemeToSvg,
  BRANDING_ASSETS_PATH,
  BRANDING_LOGO_SVG_CACHE_KEY,
  buildLogoSrc,
  DEFAULT_BRANDING,
  fetchBranding,
  fetchDashboardLogo,
  fetchProductVersion,
  sanitizeSvg,
} from '@/services/branding';

const LOGO_URL = `${BRANDING_ASSETS_PATH}che-logo.svg`;
const PLAIN_SVG = '<svg xmlns="http://www.w3.org/2000/svg"><rect/></svg>';
const THEMED_SVG =
  '<svg xmlns="http://www.w3.org/2000/svg"><path class="outer-fill" d="M0 0"/></svg>';

type Route = { ok: boolean; body?: unknown; text?: string };

/** Answers each URL with the route registered for it, 404 otherwise. */
function stubFetch(routes: Record<string, Route>): jest.Mock {
  const mock = jest.fn((url: string) => {
    const route = routes[url];
    if (!route?.ok) {
      return Promise.resolve({ ok: false, status: 404 } as Response);
    }
    return Promise.resolve({
      ok: true,
      status: 200,
      json: () => Promise.resolve(route.body),
      text: () => Promise.resolve(route.text ?? ''),
    } as Response);
  });
  window.fetch = mock as unknown as typeof window.fetch;
  return mock;
}

/** The decoded SVG behind a `data:image/svg+xml;charset=utf-8,...` URL. */
function decodeDataUrl(dataUrl: string): string {
  return decodeURIComponent(dataUrl.replace('data:image/svg+xml;charset=utf-8,', ''));
}

describe('sanitizeSvg', () => {
  it('drops script elements', () => {
    expect(
      sanitizeSvg('<svg xmlns="http://www.w3.org/2000/svg"><script>evil()</script></svg>'),
    ).not.toContain('evil()');
  });

  it('drops event handler attributes', () => {
    const sanitized = sanitizeSvg(
      '<svg xmlns="http://www.w3.org/2000/svg"><rect onload="evil()"/></svg>',
    );

    expect(sanitized).not.toContain('onload');
  });

  it('drops links that execute javascript', () => {
    const sanitized = sanitizeSvg(
      '<svg xmlns="http://www.w3.org/2000/svg"><a href="javascript:evil()"><rect/></a></svg>',
    );

    expect(sanitized).not.toContain('javascript:');
  });
});

describe('applyThemeToSvg', () => {
  it('leaves a logo without themed parts untouched', () => {
    expect(applyThemeToSvg(PLAIN_SVG, true)).toBe(PLAIN_SVG);
  });

  it('paints the themed parts light in the dark theme', () => {
    expect(applyThemeToSvg(THEMED_SVG, true)).toContain('.outer-fill { fill: #ffffff; }');
  });

  it('paints the themed parts dark in the light theme', () => {
    expect(applyThemeToSvg(THEMED_SVG, false)).toContain('.outer-fill { fill: #151515; }');
  });
});

describe('fetchBranding', () => {
  it('falls back to the defaults when there are no dashboard assets', async () => {
    stubFetch({});

    expect(await fetchBranding()).toEqual(DEFAULT_BRANDING);
  });

  it('falls back to the defaults for an empty product.json', async () => {
    stubFetch({ [`${BRANDING_ASSETS_PATH}product.json`]: { ok: true, body: {} } });

    expect(await fetchBranding()).toEqual(DEFAULT_BRANDING);
  });

  it('takes the title and the logo file the product overrides', async () => {
    stubFetch({
      [`${BRANDING_ASSETS_PATH}product.json`]: {
        ok: true,
        body: { title: 'Dev Spaces', logoFile: 'dev-spaces.svg' },
      },
    });

    expect(await fetchBranding()).toEqual({
      ...DEFAULT_BRANDING,
      title: 'Dev Spaces',
      logoFile: 'dev-spaces.svg',
    });
  });

  it('takes the product name and the help links the product overrides', async () => {
    const links = [{ text: 'Support', href: 'https://access.redhat.com/' }];
    stubFetch({
      [`${BRANDING_ASSETS_PATH}product.json`]: {
        ok: true,
        body: { name: 'Red Hat OpenShift Dev Spaces', links },
      },
    });

    const branding = await fetchBranding();

    expect(branding.name).toBe('Red Hat OpenShift Dev Spaces');
    expect(branding.links).toEqual(links);
  });

  it('keeps the default links when the product lists none that are usable', async () => {
    stubFetch({
      [`${BRANDING_ASSETS_PATH}product.json`]: {
        ok: true,
        body: { links: [{ text: 'Nowhere' }, 'not a link'] },
      },
    });

    expect((await fetchBranding()).links).toEqual(DEFAULT_BRANDING.links);
  });

  it('reports the version the product pins, so the server is not asked', async () => {
    stubFetch({
      [`${BRANDING_ASSETS_PATH}product.json`]: { ok: true, body: { productVersion: '3.21' } },
    });

    expect((await fetchBranding()).productVersion).toBe('3.21');
  });
});

describe('fetchProductVersion', () => {
  it('reads the version the Che server reports', async () => {
    stubFetch({ '/api/': { ok: true, body: { implementationVersion: '7.104.0' } } });

    expect(await fetchProductVersion()).toBe('7.104.0');
  });

  it('asks with OPTIONS, which is how the endpoint answers', async () => {
    const mock = stubFetch({ '/api/': { ok: true, body: { implementationVersion: '7.104.0' } } });

    await fetchProductVersion();

    expect(mock).toHaveBeenCalledWith('/api/', expect.objectContaining({ method: 'OPTIONS' }));
  });

  it.each([
    ['the endpoint is not there', {}],
    ['the answer carries no version', { '/api/': { ok: true, body: {} } }],
  ])('reports nothing when %s', async (_label, routes) => {
    stubFetch(routes);

    expect(await fetchProductVersion()).toBeUndefined();
  });

  it('reports nothing when the request throws', async () => {
    window.fetch = jest.fn().mockRejectedValue(new Error('offline'));

    expect(await fetchProductVersion()).toBeUndefined();
  });
});

describe('fetchDashboardLogo', () => {
  it('reads the logo an administrator set on the CheCluster', async () => {
    stubFetch({
      '/dashboard/api/server-config': {
        ok: true,
        body: { dashboardLogo: { base64data: 'AAAA', mediatype: 'image/png' } },
      },
    });

    expect(await fetchDashboardLogo()).toEqual({ base64data: 'AAAA', mediatype: 'image/png' });
  });

  it('reports nothing when the CheCluster carries no logo', async () => {
    stubFetch({ '/dashboard/api/server-config': { ok: true, body: {} } });

    expect(await fetchDashboardLogo()).toBeUndefined();
  });

  it('reports nothing rather than failing when the backend is unreachable', async () => {
    stubFetch({});

    expect(await fetchDashboardLogo()).toBeUndefined();
  });
});

describe('buildLogoSrc', () => {
  beforeEach(() => {
    window.sessionStorage.clear();
  });

  it('themes the branding asset and returns it as a data URL', async () => {
    stubFetch({ [LOGO_URL]: { ok: true, text: THEMED_SVG } });

    const src = await buildLogoSrc(undefined, 'che-logo.svg', true);

    expect(decodeDataUrl(src)).toContain('.outer-fill { fill: #ffffff; }');
  });

  it('caches the themed logo so a second render makes no request', async () => {
    const fetchMock = stubFetch({ [LOGO_URL]: { ok: true, text: THEMED_SVG } });

    const first = await buildLogoSrc(undefined, 'che-logo.svg', false);
    const second = await buildLogoSrc(undefined, 'che-logo.svg', false);

    expect(second).toBe(first);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('shares the cache with the dashboard under its own key', async () => {
    stubFetch({ [LOGO_URL]: { ok: true, text: THEMED_SVG } });

    await buildLogoSrc(undefined, 'che-logo.svg', false);

    const cache = JSON.parse(window.sessionStorage.getItem(BRANDING_LOGO_SVG_CACHE_KEY) as string);
    expect(cache[LOGO_URL].light).toBeDefined();
    expect(cache[LOGO_URL].dark).toBeUndefined();
  });

  it('re-themes from the cached original when the theme changes', async () => {
    const fetchMock = stubFetch({ [LOGO_URL]: { ok: true, text: THEMED_SVG } });

    const light = await buildLogoSrc(undefined, 'che-logo.svg', false);
    const dark = await buildLogoSrc(undefined, 'che-logo.svg', true);

    expect(dark).not.toBe(light);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('falls back to the asset URL when the logo cannot be read', async () => {
    stubFetch({});

    expect(await buildLogoSrc(undefined, 'che-logo.svg', false)).toBe(LOGO_URL);
  });

  it('uses a non-SVG asset directly', async () => {
    const fetchMock = stubFetch({});

    expect(await buildLogoSrc(undefined, 'logo.png', false)).toBe(
      `${BRANDING_ASSETS_PATH}logo.png`,
    );
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('prefers a custom SVG logo and themes it too', async () => {
    const src = await buildLogoSrc(
      { base64data: btoa(THEMED_SVG), mediatype: 'image/svg+xml' },
      'che-logo.svg',
      true,
    );

    expect(decodeDataUrl(src)).toContain('.outer-fill { fill: #ffffff; }');
  });

  it('passes a custom raster logo through as base64', async () => {
    const src = await buildLogoSrc(
      { base64data: 'AAAA', mediatype: 'image/png' },
      'che-logo.svg',
      false,
    );

    expect(src).toBe('data:image/png;base64,AAAA');
  });

  it('falls back to base64 when a custom SVG is not decodable', async () => {
    const src = await buildLogoSrc(
      { base64data: 'not-base64!!', mediatype: 'image/svg+xml' },
      'che-logo.svg',
      false,
    );

    expect(src).toBe('data:image/svg+xml;base64,not-base64!!');
  });
});
