/*
 * Copyright (c) 2015-2018 Red Hat, Inc.
 * This program and the accompanying materials are made
 * available under the terms of the Eclipse Public License 2.0
 * which is available at https://www.eclipse.org/legal/epl-2.0/
 *
 * SPDX-License-Identifier: EPL-2.0
 *
 * Contributors:
 *   Red Hat, Inc. - initial API and implementation
 */
'use strict';

import { CheBranding } from '../components/branding/che-branding';

declare const Keycloak: Function;

export interface IKeycloakAuth {
  isPresent: boolean;
  keycloak: any;
  config: any;
}

export async function keycloakSetup(cheBranding: CheBranding): Promise<IKeycloakAuth> {
  const keycloakAuth = {
    isPresent: false,
    keycloak: null,
    config: null
  };

  let hasSSO = false;

  // load keycloak settings
  let keycloakSettings;
  try {
    keycloakSettings = await angular.element.get('/api/keycloak/settings');
  } catch (e) {
    const errorMessage = `Can't get Keycloak settings: ` + e.statusText;
    console.warn(errorMessage);
    throw new Error(errorMessage);
  }

  if (!keycloakSettings['che.keycloak.js_adapter_url']) {
    return;
  }
  hasSSO = true;

  keycloakAuth.config = buildKeycloakConfig(keycloakSettings);

  // load keycloak adapter
  // initialize keycloak
  let keycloak;
  try {
    await loadKeycloakAdapter(keycloakSettings, cheBranding)
    keycloak = await initKeycloak(keycloakAuth.config, keycloakSettings);

    keycloakAuth.isPresent = true;
    keycloakAuth.keycloak = keycloak;
    /* tslint:disable */
    window['_keycloak'] = keycloak;
    /* tslint:enable */
  } catch (e) {
    if (hasSSO) {
      throw new Error(e);
    }
  }

  // test if API is reachable
  try {
    await getApis(keycloak);
  } catch (e) {
    if (hasSSO) {
      throw new Error(e);
    } else {
      throw new Error(`${e}<div>Click <a href="/">here</a> to reload page.</div>`);
    }
  }

  return keycloakAuth;
}

function buildKeycloakConfig(keycloakSettings: any): any {
  const theOidcProvider = keycloakSettings['che.keycloak.oidc_provider'];
  if (!theOidcProvider) {
    return {
      url: keycloakSettings['che.keycloak.auth_server_url'],
      realm: keycloakSettings['che.keycloak.realm'],
      clientId: keycloakSettings['che.keycloak.client_id']
    };
  } else {
    return {
      oidcProvider: theOidcProvider,
      clientId: keycloakSettings['che.keycloak.client_id']
    };
  }
}

async function loadKeycloakAdapter(keycloakSettings: any, cheBranding: CheBranding) {
  return new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.async = true;
    script.src = keycloakSettings['che.keycloak.js_adapter_url'];
    script.addEventListener('load', resolve);
    script.addEventListener('error', () => {
      return cheBranding.ready.then(() => {
        console.error('Keycloak adapter loading error.');
        reject(`
          <div class="header"><i class="fa fa-warning"></i><p>Certificate Error</p></div>
          <div class="body">
            <p>Your ${cheBranding.getProductName()} server may be using a self-signed certificate. To resolve this issue, try to import the servers CA certificate into your browser, as described <a href="${cheBranding.getDocs().certificate}" target="_blank">here</a>.</p>
            <p>After importing the certificate, refresh your browser.</p>
            <p><a href="/">Refresh Now</a></p>
          </div>
        `);
      });
    });
    script.addEventListener('abort', () => {
      const errorMessage = 'Keycloak adapter loading aborted.';
      console.error(errorMessage);
      reject(errorMessage);
    });
    document.head.appendChild(script);
  });
}

async function initKeycloak(keycloakConfig: any, keycloakSettings: any) {
  let theUseNonce = false;
  if (typeof keycloakSettings['che.keycloak.use_nonce'] === 'string') {
    theUseNonce = keycloakSettings['che.keycloak.use_nonce'].toLowerCase() === 'true';
  }
  const initOptions = {
    useNonce: theUseNonce,
    redirectUrl: keycloakSettings['che.keycloak.redirect_url.dashboard']
  };
  return new Promise((resolve, reject) => {
    const keycloak = Keycloak(keycloakConfig);
    window.sessionStorage.setItem('oidcDashboardRedirectUrl', location.href);
    keycloak.init({
      onLoad: 'login-required',
      checkLoginIframe: false,
      useNonce: initOptions['useNonce'],
      scope: 'email profile',
      redirectUri: initOptions['redirectUrl']
    }).success(() => {
      resolve(keycloak);
    }).error((e: { error: string, error_description: string }) => {
      const error = e && e.error ? `${e.error}: ${e.error_description}` : '';
      console.error('Keycloak initialization failed. ', error);
      reject(`
        <div class="header">
          <i class="fa fa-warning"></i>
          <p>SSO Error</p>
        </div>
        <div class="body">
          <p>We are experiencing some technical difficulties from our SSO${error ? ':' : '.'}</p>
          ${error ? `<p><code>${error}</code></p>` : ''}
          <p>Please try <kbd>Shift</kbd>+<kbd>Refresh</kbd></p>
        </div>
      `);
    });
  });
}

async function setAuthorizationHeader(xhr: XMLHttpRequest, keycloak: any): Promise<any> {
  return new Promise((resolve, reject) => {
    if (keycloak && keycloak.token) {
      keycloak.updateToken(5).success(() => {
        xhr.setRequestHeader('Authorization', 'Bearer ' + keycloak.token);
        resolve(xhr);
      }).error(() => {
        console.warn('Failed to refresh token');
        window.sessionStorage.setItem('oidcDashboardRedirectUrl', location.href);
        keycloak.login();
        reject('Authorization is needed.');
      });
      return;
    }

    resolve(xhr);
  });
}

async function getApis(keycloak: any): Promise<void> {
  const request = new XMLHttpRequest();
  request.open('GET', '/api/');
  return setAuthorizationHeader(request, keycloak).then((xhr: XMLHttpRequest) => {
    return new Promise<void>((resolve, reject) => {
      xhr.onreadystatechange = () => {
        if (xhr.readyState !== 4) { return; }
        if (xhr.status === 200) {
          resolve();
        } else {
          console.error(`Can't get "/api/"` + xhr.responseText ? ': ' + xhr.responseText : '.');
          reject(
            xhr.responseText
              ? xhr.responseText
              : '<div class="header"><span>Unknown error</span></div>'
          );
        }
      };
      xhr.send();
    });
  });
}
