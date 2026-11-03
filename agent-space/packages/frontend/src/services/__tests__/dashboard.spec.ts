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

import { fetchApplications, fetchUsername, signOut } from '@/services/dashboard';

const CONSOLE_APP = {
  url: 'https://console.example.com',
  title: 'OpenShift console',
  icon: '/dashboard/assets/console.svg',
  group: 'Cluster',
};

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

describe('fetchApplications', () => {
  it('lists the applications the cluster exposes', async () => {
    stubFetch({
      '/dashboard/api/cluster-info': { ok: true, body: { applications: [CONSOLE_APP] } },
    });

    expect(await fetchApplications()).toEqual([CONSOLE_APP]);
  });

  it('skips an entry that could not be rendered as a link', async () => {
    stubFetch({
      '/dashboard/api/cluster-info': {
        ok: true,
        body: { applications: [CONSOLE_APP, { title: 'No URL' }, null, 'nonsense'] },
      },
    });

    expect(await fetchApplications()).toEqual([CONSOLE_APP]);
  });

  it.each([
    ['the endpoint is not there', {}],
    [
      'the answer carries no applications',
      { '/dashboard/api/cluster-info': { ok: true, body: {} } },
    ],
    [
      'the applications are not a list',
      { '/dashboard/api/cluster-info': { ok: true, body: { applications: 'none' } } },
    ],
  ])('lists nothing when %s', async (_label, routes) => {
    stubFetch(routes);

    expect(await fetchApplications()).toEqual([]);
  });

  it('lists nothing rather than failing when the backend is unreachable', async () => {
    window.fetch = jest.fn().mockRejectedValue(new Error('offline'));

    expect(await fetchApplications()).toEqual([]);
  });
});

describe('fetchUsername', () => {
  it('reads the name the Che server reports', async () => {
    stubFetch({ '/api/user/name': { ok: true, text: 'kubeadmin\n' } });

    expect(await fetchUsername()).toBe('kubeadmin');
  });

  it('unwraps a name a gateway answered as JSON', async () => {
    stubFetch({ '/api/user/name': { ok: true, text: '"kubeadmin"' } });

    expect(await fetchUsername()).toBe('kubeadmin');
  });

  it('keeps a quoted name that is not valid JSON', async () => {
    stubFetch({ '/api/user/name': { ok: true, text: '"kube"admin"' } });

    expect(await fetchUsername()).toBe('"kube"admin"');
  });

  it('reports no name when the endpoint is not there', async () => {
    stubFetch({});

    expect(await fetchUsername()).toBe('');
  });

  it('reports no name rather than failing when the request throws', async () => {
    window.fetch = jest.fn().mockRejectedValue(new Error('offline'));

    expect(await fetchUsername()).toBe('');
  });
});

describe('signOut', () => {
  it('sends the browser to the sign-out endpoint', () => {
    const location = { pathname: '/dashboard/agent-space/' };
    Object.defineProperty(window, 'location', { writable: true, value: location });

    signOut();

    expect(location.pathname).toBe('/oauth/sign_out');
  });
});
