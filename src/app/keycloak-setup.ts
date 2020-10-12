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

const keycloakSettingsFields = [
  'che.keycloak.oidc_provider',
  'che.keycloak.auth_server_url',
  'che.keycloak.client_id',
  'che.keycloak.js_adapter_url',
  'che.keycloak.jwks.endpoint',
  'che.keycloak.logout.endpoint',
  'che.keycloak.password.endpoint',
  'che.keycloak.profile.endpoint',
  'che.keycloak.realm',
  'che.keycloak.token.endpoint',
  'che.keycloak.use_nonce',
  'che.keycloak.userinfo.endpoint',
  'che.keycloak.username_claim',
  'che.keycloak.redirect_url.dashboard'] as const;
type KeycloakSettingsField = typeof keycloakSettingsFields[number];

function isOfTypeKeycloakSettingsField (settingField: string): settingField is KeycloakSettingsField {
  return (keycloakSettingsFields as readonly string[]).indexOf(settingField) >= 0;
}

type KeycloakSettingsMap = Map<KeycloakSettingsField, string>;

export async function keycloakSetup(cheBranding: CheBranding, isDevMode?: boolean): Promise<IKeycloakAuth> {
  const keycloakAuth = {
    isPresent: false,
    keycloak: null,
    config: null
  };

  let hasSSO = false;

  // load keycloak settings
  let keycloakSettings: KeycloakSettingsMap = new Map();
  try {
    const settings = await angular.element.get('/api/keycloak/settings');

    for (const key of Object.keys(settings)) {
      if (isOfTypeKeycloakSettingsField(key)) {
          keycloakSettings.set(key, settings[key])
      } else {
        console.warn('Skip keycloak settings field: ', key);
      }
    }
  } catch (e) {
    if (e.status == 404 || (isDevMode && e.status == 0)) {
      //keycloak is not configured. Running in Single User mode
      return;
    }

    const errorMessage = `Can't get Keycloak settings: ` + e.status  + ' ' + e.statusText;
    console.warn(errorMessage);
    throw new Error(errorMessage);
  }

  if (!keycloakSettings.get('che.keycloak.js_adapter_url')) {
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

function buildKeycloakConfig(keycloakSettings: KeycloakSettingsMap): any {
  const theOidcProvider = keycloakSettings.get('che.keycloak.oidc_provider');
  if (!theOidcProvider) {
    return {
      url: keycloakSettings.get('che.keycloak.auth_server_url'),
      realm: keycloakSettings.get('che.keycloak.realm'),
      clientId: keycloakSettings.get('che.keycloak.client_id')
    };
  }

  return {
    oidcProvider: theOidcProvider,
    clientId: keycloakSettings.get('che.keycloak.client_id')
  };
}

async function loadKeycloakAdapter(keycloakSettings: KeycloakSettingsMap, cheBranding: CheBranding) {
  return new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.async = true;
    script.src = keycloakSettings.get('che.keycloak.js_adapter_url');
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

async function initKeycloak(keycloakConfig: any, keycloakSettings: KeycloakSettingsMap) {
  let theUseNonce = false;
  if (typeof keycloakSettings.get('che.keycloak.use_nonce') === 'string') {
    theUseNonce = keycloakSettings.get('che.keycloak.use_nonce').toLowerCase() === 'true';
  }
  const initOptions = {
    useNonce: theUseNonce,
    redirectUrl: keycloakSettings.get('che.keycloak.redirect_url.dashboard')
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
