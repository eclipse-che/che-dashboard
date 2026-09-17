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
  buildFactoryLoaderPath,
  getRedirectUrl,
  isValidRedirectUrl,
  redirectToDashboard,
  storePathIfNeeded,
} from '@/preload/main';
import { REMOTES_ATTR } from '@/services/helpers/factoryFlow/buildFactoryParams';
import SessionStorageService, { SessionStorageKey } from '@/services/session-storage';

describe('test buildFactoryLoaderPath()', () => {
  describe('URL', () => {
    test('unsupported parameter', () => {
      const result = buildFactoryLoaderPath(
        'https://github.com/che-samples/java-spring-petclinic/tree/devfilev2?unsupportedParameter=foo',
      );
      expect(result).toEqual(
        '/f?url=https%253A%252F%252Fgithub.com%252Fche-samples%252Fjava-spring-petclinic%252Ftree%252Fdevfilev2%25253FunsupportedParameter%25253Dfoo',
      );
    });
  });
  describe('SSHLocation', () => {
    test('new policy', () => {
      const result = buildFactoryLoaderPath('git@github.com:eclipse-che/che-dashboard.git?new=');
      expect(result).toEqual(
        '/f?policies.create=perclick&url=git%2540github.com%253Aeclipse-che%252Fche-dashboard.git',
      );
    });

    test('che-editor parameter', () => {
      const result = buildFactoryLoaderPath(
        'git@github.com:eclipse-che/che-dashboard.git?che-editor=che-incubator/checode/insiders',
      );
      expect(result).toEqual(
        '/f?che-editor=che-incubator%2Fchecode%2Finsiders&url=git%2540github.com%253Aeclipse-che%252Fche-dashboard.git',
      );
    });

    test('editor-image parameter', () => {
      const result = buildFactoryLoaderPath(
        'git@github.com:eclipse-che/che-dashboard.git?editor-image=quay.io/mloriedo/che-code:copilot-builtin',
      );
      expect(result).toEqual(
        '/f?editor-image=quay.io%2Fmloriedo%2Fche-code%3Acopilot-builtin&url=git%2540github.com%253Aeclipse-che%252Fche-dashboard.git',
      );
    });

    test('devfilePath parameter', () => {
      const result = buildFactoryLoaderPath(
        'git@github.com:eclipse-che/che-dashboard.git?devfilePath=devfilev2.yaml',
      );
      expect(result).toEqual(
        '/f?override.devfileFilename=devfilev2.yaml&url=git%2540github.com%253Aeclipse-che%252Fche-dashboard.git',
      );
    });

    test('devWorkspace parameter', () => {
      const result = buildFactoryLoaderPath(
        'git@github.com:eclipse-che/che-dashboard.git?devWorkspace=/devfiles/devworkspace-che-theia-latest.yaml',
      );
      expect(result).toEqual(
        '/f?devWorkspace=%2Fdevfiles%2Fdevworkspace-che-theia-latest.yaml&url=git%2540github.com%253Aeclipse-che%252Fche-dashboard.git',
      );
    });

    test('storageType parameter', () => {
      const result = buildFactoryLoaderPath(
        'git@github.com:eclipse-che/che-dashboard.git?storageType=ephemeral',
      );
      expect(result).toEqual(
        '/f?storageType=ephemeral&url=git%2540github.com%253Aeclipse-che%252Fche-dashboard.git',
      );
    });

    test('existing parameter', () => {
      const result = buildFactoryLoaderPath(
        'git@github.com:eclipse-che/che-dashboard.git?existing=che-dashboard',
      );
      expect(result).toEqual(
        '/f?existing=che-dashboard&url=git%2540github.com%253Aeclipse-che%252Fche-dashboard.git',
      );
    });

    test('unsupported parameter', () => {
      const result = buildFactoryLoaderPath(
        'git@github.com:eclipse-che/che-dashboard.git?unsupportedParameter=foo',
      );
      expect(result).toEqual(
        '/f?url=git%2540github.com%253Aeclipse-che%252Fche-dashboard.git%25253FunsupportedParameter%25253Dfoo',
      );
    });
  });

  describe('FullPathUrl', () => {
    test('new policy', () => {
      const result = buildFactoryLoaderPath(
        'https://github.com/che-samples/java-spring-petclinic/tree/devfilev2?new=',
      );
      expect(result).toEqual(
        '/f?policies.create=perclick&url=https%253A%252F%252Fgithub.com%252Fche-samples%252Fjava-spring-petclinic%252Ftree%252Fdevfilev2',
      );
    });

    test('che-editor parameter', () => {
      const result = buildFactoryLoaderPath(
        'https://github.com/che-samples/java-spring-petclinic/tree/devfilev2?che-editor=che-incubator/checode/insiders',
      );
      expect(result).toEqual(
        '/f?che-editor=che-incubator%2Fchecode%2Finsiders&url=https%253A%252F%252Fgithub.com%252Fche-samples%252Fjava-spring-petclinic%252Ftree%252Fdevfilev2',
      );
    });

    test('devfilePath parameter', () => {
      const result = buildFactoryLoaderPath(
        'https://github.com/che-samples/java-spring-petclinic/tree/devfilev2?devfilePath=devfilev2.yaml',
      );
      expect(result).toEqual(
        '/f?override.devfileFilename=devfilev2.yaml&url=https%253A%252F%252Fgithub.com%252Fche-samples%252Fjava-spring-petclinic%252Ftree%252Fdevfilev2',
      );
    });

    test('devWorkspace parameter', () => {
      const result = buildFactoryLoaderPath(
        'https://github.com/che-samples/java-spring-petclinic/tree/devfilev2?devWorkspace=/devfiles/devworkspace-che-theia-latest.yaml',
      );
      expect(result).toEqual(
        '/f?devWorkspace=%2Fdevfiles%2Fdevworkspace-che-theia-latest.yaml&url=https%253A%252F%252Fgithub.com%252Fche-samples%252Fjava-spring-petclinic%252Ftree%252Fdevfilev2',
      );
    });

    test('storageType parameter', () => {
      const result = buildFactoryLoaderPath(
        'https://github.com/che-samples/java-spring-petclinic/tree/devfilev2?storageType=ephemeral',
      );
      expect(result).toEqual(
        '/f?storageType=ephemeral&url=https%253A%252F%252Fgithub.com%252Fche-samples%252Fjava-spring-petclinic%252Ftree%252Fdevfilev2',
      );
    });

    test('image parameter', () => {
      const result = buildFactoryLoaderPath(
        'https://github.com/che-samples/java-spring-petclinic/tree/devfilev2?image=quay.io/devfile/universal-developer-image:latest',
      );
      expect(result).toEqual(
        '/f?image=quay.io%2Fdevfile%2Funiversal-developer-image%3Alatest&url=https%253A%252F%252Fgithub.com%252Fche-samples%252Fjava-spring-petclinic%252Ftree%252Fdevfilev2',
      );
    });

    test('unsupported parameter', () => {
      const result = buildFactoryLoaderPath(
        'https://github.com/che-samples/java-spring-petclinic/tree/devfilev2?unsupportedParameter=foo',
      );
      expect(result).toEqual(
        '/f?url=https%253A%252F%252Fgithub.com%252Fche-samples%252Fjava-spring-petclinic%252Ftree%252Fdevfilev2%25253FunsupportedParameter%25253Dfoo',
      );
    });
  });
});

describe('test storePathnameIfNeeded()', () => {
  let mockUpdate: jest.Mock;

  beforeAll(() => {
    mockUpdate = jest.fn();
    SessionStorageService.update = mockUpdate;
  });

  afterEach(() => {
    mockUpdate.mockClear();
  });

  test('regular path', () => {
    storePathIfNeeded('/test');
    expect(mockUpdate).toHaveBeenCalledWith(SessionStorageKey.ORIGINAL_LOCATION_PATH, '/test');
  });

  test('empty path', () => {
    storePathIfNeeded('/');
    expect(mockUpdate).toHaveBeenCalledTimes(0);
  });
});

describe('test redirectToDashboard()', () => {
  const origin = 'https://che-host';
  let spyWindowLocation: jest.SpyInstance;

  afterEach(() => {
    spyWindowLocation.mockRestore();
  });

  describe('wrong pathname', () => {
    it('should redirect to home', () => {
      spyWindowLocation = createWindowLocationSpy(origin + '/test');

      redirectToDashboard();
      expect(spyWindowLocation).toHaveBeenCalledWith(origin + '/dashboard/');
    });
  });

  describe('factory url', () => {
    test('with HTTP protocol', () => {
      const repoUrl = 'https://repo-url';
      const query = 'new';
      spyWindowLocation = createWindowLocationSpy(origin + '#' + repoUrl + '&' + query);

      redirectToDashboard();
      expect(spyWindowLocation).toHaveBeenCalledWith(
        origin +
          '/dashboard/f?policies.create=perclick&url=' +
          encodeURIComponent(encodeURIComponent(repoUrl)),
      );
    });

    test('with SHH protocol', () => {
      const repoUrl = 'git@github.com:namespace/myrepo.git';
      const query = 'devfilePath=my-devfile.yaml';
      spyWindowLocation = createWindowLocationSpy(origin + '#' + repoUrl + '&' + query);

      redirectToDashboard();
      expect(spyWindowLocation).toHaveBeenCalledWith(
        origin +
          '/dashboard/f?override.devfileFilename=my-devfile.yaml&url=' +
          encodeURIComponent(encodeURIComponent(repoUrl)),
      );
    });
  });

  describe('redirect after authentication', () => {
    it('should redirect to the workspace creation flow', () => {
      const remoteUrl = '{https://origin-url,https://upstream-url}';
      spyWindowLocation = createWindowLocationSpy(origin + '?' + REMOTES_ATTR + '=' + remoteUrl);

      redirectToDashboard();
      expect(spyWindowLocation).toHaveBeenCalledWith(
        origin + '/dashboard/f?remotes=' + encodeURIComponent(remoteUrl),
      );
    });
  });

  test.each([
    '/dashboard/#/load-factory',
    '/dashboard/#/ide/ns/ws',
    '/dashboard/f',
    '/dashboard/w',
  ])('leaves application route %s unchanged with redirect configured', route => {
    window.CHE_DASHBOARD_REDIRECT_URL = 'https://alternative.example.com';
    spyWindowLocation = createWindowLocationSpy(origin + route);
    try {
      redirectToDashboard();
      expect(window.location.replace).not.toHaveBeenCalled();
      expect(spyWindowLocation).not.toHaveBeenCalled();
    } finally {
      delete window.CHE_DASHBOARD_REDIRECT_URL;
    }
  });

  describe('alternative dashboard redirect', () => {
    const altDashboardUrl = 'https://alternative-dashboard.example.com';

    afterEach(() => {
      delete window.CHE_DASHBOARD_REDIRECT_URL;
      delete process.env.CHE_DASHBOARD_REDIRECT_URL;
    });

    it('should redirect to alternative dashboard URL via window.location.replace when configured in env', () => {
      process.env.CHE_DASHBOARD_REDIRECT_URL = altDashboardUrl;
      spyWindowLocation = createWindowLocationSpy(origin + '/');

      redirectToDashboard();
      expect(window.location.replace).toHaveBeenCalledWith(altDashboardUrl);
      expect(spyWindowLocation).not.toHaveBeenCalled();
    });

    it('should redirect to alternative dashboard URL via window.location.replace when configured on window', () => {
      window.CHE_DASHBOARD_REDIRECT_URL = altDashboardUrl;
      spyWindowLocation = createWindowLocationSpy(origin + '/');

      redirectToDashboard();
      expect(window.location.replace).toHaveBeenCalledWith(altDashboardUrl);
      expect(spyWindowLocation).not.toHaveBeenCalled();
    });

    it('should NOT redirect to alternative dashboard when factory hash is present', () => {
      process.env.CHE_DASHBOARD_REDIRECT_URL = altDashboardUrl;
      const repoUrl = 'https://github.com/eclipse-che/che-dashboard';
      spyWindowLocation = createWindowLocationSpy(origin + '#' + repoUrl);

      redirectToDashboard();
      expect(window.location.replace).not.toHaveBeenCalled();
      expect(spyWindowLocation).toHaveBeenCalledWith(
        origin + '/dashboard/f?url=' + encodeURIComponent(encodeURIComponent(repoUrl)),
      );
    });

    it('should NOT redirect to alternative dashboard when remotes query is present', () => {
      process.env.CHE_DASHBOARD_REDIRECT_URL = altDashboardUrl;
      const remoteUrl = '{https://origin-url,https://upstream-url}';
      spyWindowLocation = createWindowLocationSpy(origin + '?' + REMOTES_ATTR + '=' + remoteUrl);

      redirectToDashboard();
      expect(window.location.replace).not.toHaveBeenCalled();
      expect(spyWindowLocation).toHaveBeenCalledWith(
        origin + '/dashboard/f?remotes=' + encodeURIComponent(remoteUrl),
      );
    });

    test.each([
      ['unset', undefined],
      ['empty', '   '],
      ['malformed', 'not-a-valid-url'],
      ['non-http/https protocol', 'javascript:alert(1)'],
      ['self-redirect loop', origin + '/'],
    ])('should safely fall back to existing behavior when redirect URL is %s', (_, redirectUrl) => {
      if (redirectUrl === undefined) {
        delete process.env.CHE_DASHBOARD_REDIRECT_URL;
        delete window.CHE_DASHBOARD_REDIRECT_URL;
      } else {
        process.env.CHE_DASHBOARD_REDIRECT_URL = redirectUrl;
      }
      spyWindowLocation = createWindowLocationSpy(origin + '/');

      redirectToDashboard();
      expect(window.location.replace).not.toHaveBeenCalled();
      expect(spyWindowLocation).toHaveBeenCalledWith(origin + '/dashboard/');
    });

    it('allows the same-origin dashboard application because it does not run root preload', () => {
      process.env.CHE_DASHBOARD_REDIRECT_URL = origin + '/dashboard';
      spyWindowLocation = createWindowLocationSpy(origin + '/');

      redirectToDashboard();
      expect(window.location.replace).toHaveBeenCalledWith(origin + '/dashboard');
      expect(spyWindowLocation).not.toHaveBeenCalled();
    });
  });
});

describe('test isValidRedirectUrl()', () => {
  const currentOrigin = 'https://che-host';

  test.each([
    ['', false],
    ['   ', false],
    [undefined, false],
    [' \thttps://example.com/app?x=1#section \n', true],
    ['https://console.redhat.com', true],
    ['http://my-dashboard.local:3000/workspaces', true],
    ['http://', false],
    ['https://', false],
    ['https:///example.com', false],
    ['https:example.com', false],
    ['ftp://example.com', false],
    ['data:text/html,test', false],
    ['javascript:alert(1)', false],
    ['not-a-url', false],
    ['//example.com', false],
    ['//missing-protocol', false],
    ['https://:443/path', false],
    ['https://example.com:65536', false],
    ['https://example.com:abc', false],
    ['http://example.com:0/path', true],
    ['https://example.com:65535/path?foo=bar#section', true],
    ['https://alternative.example.com:8443/custom/path?param=1&other=2#frag', true],
    ['http://192.168.1.100:8080/app', true],
    ['http://[::1]:8080/app', true],
    ['http://[invalid]/', false],
    ['http://[192.0.2.1]/', false],
    ['https://ｃｈｅ-host/', false],
    ['http://999.999.999.999/', false],
    ['https://exa mple.com/', false],
    ['https://example.com\\path', false],
    ['https://che-host', false],
    ['https://che-host/', false],
    ['https://CHE-HOST:0443/index.html?x=1#x', false],
    ['https://che-host/a/../', false],
    ['https://che-host/%2e/index.html', false],
    ['https://che-host/dashboard', true],
    ['https://che-host/dashboard/', true],
    ['https://che-host/custom-app', true],
    ['https://che-host/some-other-path', true],
    ['http://che-host/', true],
    ['https://che-host:8443/', true],
  ])('validates %s consistently with ConsoleLink', (value, expected) => {
    expect(isValidRedirectUrl(value, currentOrigin)).toBe(expected);
  });
});

describe('test getRedirectUrl()', () => {
  afterEach(() => {
    delete window.CHE_DASHBOARD_REDIRECT_URL;
    delete process.env.CHE_DASHBOARD_REDIRECT_URL;
  });

  test('returns undefined when neither window nor process.env is set', () => {
    expect(getRedirectUrl()).toBeUndefined();
  });

  test('returns window value when set', () => {
    window.CHE_DASHBOARD_REDIRECT_URL = 'https://window-target.example.com';
    expect(getRedirectUrl()).toBe('https://window-target.example.com');
  });

  test('returns process.env value when window is not set', () => {
    process.env.CHE_DASHBOARD_REDIRECT_URL = 'https://env-target.example.com';
    expect(getRedirectUrl()).toBe('https://env-target.example.com');
  });
});

function createWindowLocationSpy(href: string): jest.SpyInstance {
  Reflect.deleteProperty(window, 'location');
  const url = new URL(href);
  const replaceMock = jest.fn();
  (window.location as Partial<Location>) = {
    protocol: url.protocol,
    host: url.host,
    hostname: url.hostname,
    port: url.port,
    pathname: url.pathname,
    search: url.search,
    hash: url.hash,
    origin: url.origin,
    replace: replaceMock,
  };
  Object.defineProperty(window.location, 'href', {
    set: () => {
      // no-op
    },
    configurable: true,
    get: () => href,
  });
  return jest.spyOn(window.location, 'href', 'set');
}
