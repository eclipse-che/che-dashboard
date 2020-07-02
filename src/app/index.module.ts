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

import {Register} from '../components/utils/register';
import {FactoryConfig} from './factories/factories-config';
import {ComponentsConfig} from '../components/components-config';
import {AdminsConfig} from './admin/admin-config';
import {AdministrationConfig} from './administration/administration-config';
import {CheColorsConfig} from './colors/che-color.constant';
import {CheOutputColorsConfig} from './colors/che-output-colors.constant';
// switch to a config
import {IdeConfig} from './ide/ide-config';
import {NavbarConfig} from './navbar/navbar-config';
import {ProxySettingsConfig} from './proxy/proxy-settings.constant';
import {WorkspacesConfig} from './workspaces/workspaces-config';
import {StacksConfig} from './stacks/stacks-config';
import {GetStartedConfig} from './get-started/get-started-config';
import {DemoComponentsController} from './demo-components/demo-components.controller';
import {ChePreferences} from '../components/api/che-preferences.factory';
import {RoutingRedirect} from '../components/routing/routing-redirect.factory';
import {RouteHistory} from '../components/routing/route-history.service';
import {CheUIElementsInjectorService} from '../components/service/injector/che-ui-elements-injector.service';
import {OrganizationsConfig} from './organizations/organizations-config';
import {TeamsConfig} from './teams/teams-config';
import {ProfileConfig} from './profile/profile-config';
import {ResourceFetcherService} from '../components/service/resource-fetcher/resource-fetcher.service';
import {CheBranding} from '../components/branding/che-branding';
import { RegistryCheckingService } from '../components/service/registry-checking.service';
import { DetectSupportedBrowserService } from '../components/service/browser-detect';

// init module
const initModule = angular.module('userDashboard', ['ngAnimate', 'ngCookies', 'ngTouch', 'ngSanitize', 'ngResource', 'ngRoute',
  'angular-websocket', 'ui.bootstrap', 'ngMaterial', 'ngMessages', 'angularMoment', 'angular.filter',
  'ngLodash', 'uuid4', 'angularFileUpload', 'ui.gravatar']);

// register singletons which can be used before resumeBootstrap
const cheBranding = CheBranding.get();
initModule.constant('cheBranding', cheBranding);

window.name = 'NG_DEFER_BOOTSTRAP!';

declare const Keycloak: Function;

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

interface IResolveFn<T> {
  (value?: T | PromiseLike<T>): void;
}
interface IRejectFn {
  (reason: string): void;
}

function keycloakLoad(keycloakSettings: any) {
  return new Promise((resolve: IResolveFn<any>, reject: IRejectFn) => {
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

function keycloakInit(keycloakConfig: any, initOptions: any) {
  return new Promise((resolve: IResolveFn<any>, reject: IRejectFn) => {
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
    }).error((e: {error: string, error_description: string}) => {
      console.error(`Keycloak initialization failed. ${e.error}: ${e.error_description}`);
      reject(`
        <div class="header">
          <i class="fa fa-warning"></i>
          <p>SSO Error</p>
        </div>
        <div class="body">
          <p>We are experiencing some technical difficulties from our SSO:</p>
          <p><code>${e.error}: ${e.error_description}</code></p>
          <p>Please try <kbd>Shift</kbd>+<kbd>Refresh</kbd></p>
        </div>
      `);
    });
  });
}
function setAuthorizationHeader(xhr: XMLHttpRequest, keycloak: any): Promise<any> {
  return new Promise((resolve: IResolveFn<any>, reject: IRejectFn) => {
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
function getApis(keycloak: any): Promise<void> {
  const request = new XMLHttpRequest();
  request.open('GET', '/api/');
  return setAuthorizationHeader(request, keycloak).then((xhr: XMLHttpRequest) => {
    return new Promise<void>((resolve: IResolveFn<void>, reject: IRejectFn) => {
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
function showErrorMessage(message: string) {
  cheBranding.ready.then(() => {
    const backdrop = document.createElement('div');
    backdrop.className = 'keycloak-error-backdrop';
    const messageArea = document.createElement('div');
    messageArea.className = 'keycloak-error';
    const footerLogo = document.createElement('img');
    footerLogo.src = cheBranding.getProductLogo();
    footerLogo.className="footer-logo";
    backdrop.appendChild(messageArea);
    backdrop.appendChild(footerLogo);
    const errorMessage = document.createElement('div');
    messageArea.appendChild(errorMessage);
    errorMessage.innerHTML = message;
    document.querySelector('.main-page-loader').appendChild(backdrop);
  });
}

const keycloakAuth = {
  isPresent: false,
  keycloak: null,
  config: null
};
initModule.constant('keycloakAuth', keycloakAuth);

angular.element(document).ready(() => {
  const promise = new Promise((resolve, reject: IRejectFn) => {
    angular.element.get('/api/keycloak/settings').then(resolve, error => {
      const errorMessage = `Can't get Keycloak settings: ` + error.statusText;
      console.warn(errorMessage);
      reject(errorMessage);
    });
  });

  let hasSSO = false;
  promise.then((keycloakSettings: any) => {
    if (!keycloakSettings['che.keycloak.js_adapter_url']) {
      return;
    }
    hasSSO = true;

    keycloakAuth.config = buildKeycloakConfig(keycloakSettings);

    // load Keycloak
    return keycloakLoad(keycloakSettings).then(() => {
      // init Keycloak
      let theUseNonce = false;
      if (typeof keycloakSettings['che.keycloak.use_nonce'] === 'string') {
        theUseNonce = keycloakSettings['che.keycloak.use_nonce'].toLowerCase() === 'true';
      }
      const initOptions = {
        useNonce: theUseNonce,
        redirectUrl: keycloakSettings['che.keycloak.redirect_url.dashboard']
      };
      return keycloakInit(keycloakAuth.config, initOptions);
    }).then((keycloak: any) => {
      keycloakAuth.isPresent = true;
      keycloakAuth.keycloak = keycloak;
      /* tslint:disable */
      window['_keycloak'] = keycloak;
      /* tslint:enable */
    });
  }).catch((errorMessage: string) => {
    if (hasSSO) {
      return Promise.reject(errorMessage);
    }
  }).then(() => {
    const keycloak = (window as any)._keycloak;
    // try to reach the API
    // to check if user is authorized to do that
    return getApis(keycloak);
  }).then(() => {
    cheBranding.ready.then(() => {
      (angular as any).resumeBootstrap();
    });
  }).catch((errorMessage: string) => {
    if (hasSSO) {
      showErrorMessage(errorMessage);
    } else {
      showErrorMessage(`${errorMessage}<div>Click <a href="/">here</a> to reload page.</div>`);
    }
  });
});

initModule.config(['$locationProvider', $locationProvider => {
  $locationProvider.hashPrefix('');
}]);

// add a global resolve flag on all routes (user needs to be resolved first)
initModule.config(['$routeProvider', ($routeProvider: che.route.IRouteProvider) => {
  $routeProvider.accessWhen = (path: string, route: che.route.IRoute) => {
    if (angular.isUndefined(route.resolve)) {
      route.resolve = {};
    }
    (route.resolve as any).app = ['$q', 'chePreferences', ($q: ng.IQService, chePreferences: ChePreferences) => {
      const deferred = $q.defer();
      if (chePreferences.getPreferences()) {
        deferred.resolve();
      } else {
        chePreferences.fetchPreferences().then(() => {
          deferred.resolve();
        }, (error: any) => {
          deferred.reject(error);
        });
      }
      return deferred.promise;
    }];

    return $routeProvider.when(path, route);
  };

  $routeProvider.accessOtherWise = (route: che.route.IRoute) => {
    if (angular.isUndefined(route.resolve)) {
      route.resolve = {};
    }
    (route.resolve as any).app = ['$q', 'chePreferences', ($q: ng.IQService, chePreferences: ChePreferences) => {
      const deferred = $q.defer();
      if (chePreferences.getPreferences()) {
        deferred.resolve();
      } else {
        chePreferences.fetchPreferences().then(() => {
          deferred.resolve();
        }, (error: any) => {
          deferred.reject(error);
        });
      }
      return deferred.promise;
    }];
    return $routeProvider.otherwise(route);
  };


}]);

const DEV = false;

// configs
initModule.config(['$routeProvider', ($routeProvider: che.route.IRouteProvider) => {
  // config routes (add demo page)
  if (DEV) {
    $routeProvider.accessWhen('/demo-components', {
      title: 'Demo Components',
      templateUrl: 'app/demo-components/demo-components.html',
      controller: 'DemoComponentsController',
      controllerAs: 'demoComponentsController',
      reloadOnSearch: false
    });
  }

  $routeProvider.accessOtherWise({
    redirectTo: '/workspaces'
  });
}]);

/**
 * Setup route redirect module
 */
initModule.run([
  '$location',
  '$mdSidenav',
  '$rootScope',
  '$routeParams',
  '$timeout',
  'cheUIElementsInjectorService',
  'detectSupportedBrowserService',
  'registryCheckingService',
  'resourceFetcherService',
  'routeHistory',
  'routingRedirect',
  'workspaceDetailsService',
  (
    $location: ng.ILocationService,
    $mdSidenav: ng.material.ISidenavService,
    $rootScope: che.IRootScopeService,
    $routeParams: ng.route.IRouteParamsService,
    $timeout: ng.ITimeoutService,
    cheUIElementsInjectorService: CheUIElementsInjectorService,
    detectSupportedBrowserService: DetectSupportedBrowserService,
    registryCheckingService: RegistryCheckingService,
    resourceFetcherService: ResourceFetcherService,
    routeHistory: RouteHistory,
    routingRedirect: RoutingRedirect,
  ) => {
    $rootScope.hideLoader = false;
    $rootScope.waitingLoaded = false;
    $rootScope.showIDE = false;
    $rootScope.hideNavbar = false;
    $rootScope.branding = cheBranding.all;

    // here only to create instances of these components
    /* tslint:disable */
    registryCheckingService;
    resourceFetcherService;
    routeHistory;
    detectSupportedBrowserService;
    /* tslint:enable */

    $rootScope.$on('$viewContentLoaded', () => {
      cheUIElementsInjectorService.injectAll();
      $timeout(() => {
        if (!$rootScope.hideLoader) {
          if (!$rootScope.wantTokeepLoader) {
            $rootScope.hideLoader = true;
          } else {
            $rootScope.hideLoader = false;
          }
        }
        $rootScope.waitingLoaded = true;
      }, 1000);
    });

    $rootScope.$on('$routeChangeStart', (event: any, next: any) => {
      if (DEV) {
        console.log('$routeChangeStart event with route', next);
      }
    });

    $rootScope.$on('$routeChangeSuccess', (event: ng.IAngularEvent, next: ng.route.IRoute) => {
      const route = (<any>next).$$route;
      if (angular.isFunction(route.title)) {
        $rootScope.currentPage = route.title($routeParams);
      } else {
        $rootScope.currentPage = route.title || 'Dashboard';
      }
      const originalPath: string = route.originalPath;
      if (originalPath && originalPath.indexOf('/ide/') === -1) {
        $rootScope.showIDE = false;
        if ($rootScope.hideNavbar) {
          $rootScope.hideNavbar = false;
          $mdSidenav('left').open();
        }
      }
      // when a route is about to change, notify the routing redirect node
      if (next.resolve) {
        if (DEV) {
          console.log('$routeChangeSuccess event with route', next);
        }// check routes
        routingRedirect.check(event, next);
      }
    });

    $rootScope.$on('$routeChangeError', () => {
      $location.path('/');
    });
  }
]);

initModule.config(['$mdThemingProvider', 'jsonColors', ($mdThemingProvider: ng.material.IThemingProvider, jsonColors: any) => {
  const cheColors = angular.fromJson(jsonColors);
  const getColor = (key: string) => {
    let color = cheColors[key];
    if (!color) {
      // return a flashy red color if color is undefined
      console.log('error, the color' + key + 'is undefined');
      return '#ff0000';
    }
    if (color.indexOf('$') === 0) {
      color = getColor(color);
    }
    return color;

  };

  const cheMap = $mdThemingProvider.extendPalette('indigo', {
    '500': getColor('$dark-menu-color'),
    '300': 'D0D0D0'
  });
  $mdThemingProvider.definePalette('che', cheMap);

  const cheDangerMap = $mdThemingProvider.extendPalette('red', {});
  $mdThemingProvider.definePalette('cheDanger', cheDangerMap);

  const cheWarningMap = $mdThemingProvider.extendPalette('orange', {
    'contrastDefaultColor': 'light'
  });
  $mdThemingProvider.definePalette('cheWarning', cheWarningMap);

  const cheGreenMap = $mdThemingProvider.extendPalette('green', {
    'A100': '#46AF00',
    'contrastDefaultColor': 'light'
  });
  $mdThemingProvider.definePalette('cheGreen', cheGreenMap);

  const cheDefaultMap = $mdThemingProvider.extendPalette('blue', {
    'A400': getColor('$che-medium-blue-color')
  });
  $mdThemingProvider.definePalette('cheDefault', cheDefaultMap);

  const cheNoticeMap = $mdThemingProvider.extendPalette('blue', {
    'A400': getColor('$mouse-gray-color')
  });
  $mdThemingProvider.definePalette('cheNotice', cheNoticeMap);

  const cheAccentMap = $mdThemingProvider.extendPalette('blue', {
    '700': getColor('$che-medium-blue-color'),
    'A400': getColor('$che-medium-blue-color'),
    'A200': getColor('$che-medium-blue-color'),
    'contrastDefaultColor': 'light'
  });
  $mdThemingProvider.definePalette('cheAccent', cheAccentMap);

  const cheNavyPalette = $mdThemingProvider.extendPalette('purple', {
    '500': getColor('$che-navy-color'),
    'contrastDefaultColor': 'light'
  });
  $mdThemingProvider.definePalette('cheNavyPalette', cheNavyPalette);

  const toolbarPrimaryPalette = $mdThemingProvider.extendPalette('purple', {
    '500': getColor('$che-white-color'),
    'contrastDefaultColor': 'dark'
  });
  $mdThemingProvider.definePalette('toolbarPrimaryPalette', toolbarPrimaryPalette);

  const toolbarAccentPalette = $mdThemingProvider.extendPalette('purple', {
    'A200': 'EF6C00',
    '700': 'E65100',
    'contrastDefaultColor': 'light'
  });
  $mdThemingProvider.definePalette('toolbarAccentPalette', toolbarAccentPalette);

  const cheGreyPalette = $mdThemingProvider.extendPalette('grey', {
    'A100': 'efefef',
    'contrastDefaultColor': 'light'
  });
  $mdThemingProvider.definePalette('cheGrey', cheGreyPalette);

  $mdThemingProvider.theme('danger')
    .primaryPalette('che')
    .accentPalette('cheDanger')
    .backgroundPalette('grey');

  $mdThemingProvider.theme('warning')
    .primaryPalette('che')
    .accentPalette('cheWarning')
    .backgroundPalette('grey');

  $mdThemingProvider.theme('chesave')
    .primaryPalette('green')
    .accentPalette('cheGreen')
    .backgroundPalette('grey');

  $mdThemingProvider.theme('checancel')
    .primaryPalette('che')
    .accentPalette('cheGrey')
    .backgroundPalette('grey');

  $mdThemingProvider.theme('chedefault')
    .primaryPalette('che')
    .accentPalette('cheDefault')
    .backgroundPalette('grey');

  $mdThemingProvider.theme('chenotice')
    .primaryPalette('che')
    .accentPalette('cheNotice')
    .backgroundPalette('grey');

  $mdThemingProvider.theme('default')
    .primaryPalette('che')
    .accentPalette('cheAccent')
    .backgroundPalette('grey');

  $mdThemingProvider.theme('toolbar-theme')
    .primaryPalette('toolbarPrimaryPalette')
    .accentPalette('toolbarAccentPalette');

  $mdThemingProvider.theme('factory-theme')
    .primaryPalette('light-blue')
    .accentPalette('pink')
    .warnPalette('red')
    .backgroundPalette('purple');

  $mdThemingProvider.theme('onboarding-theme')
    .primaryPalette('cheNavyPalette')
    .accentPalette('pink')
    .warnPalette('red')
    .backgroundPalette('purple');

  $mdThemingProvider.theme('dashboard-theme')
    .primaryPalette('cheNavyPalette')
    .accentPalette('pink')
    .warnPalette('red')
    .backgroundPalette('purple');

  $mdThemingProvider.theme('maincontent-theme')
    .primaryPalette('che')
    .accentPalette('cheAccent');
}]);

initModule.constant('userDashboardConfig', {
  developmentMode: DEV
});

const instanceRegister = new Register(initModule);

if (DEV) {
  instanceRegister.controller('DemoComponentsController', DemoComponentsController);
}

/* tslint:disable */
new ProxySettingsConfig(instanceRegister);
new CheColorsConfig(instanceRegister);
new CheOutputColorsConfig(instanceRegister);
new ComponentsConfig(instanceRegister);
new AdminsConfig(instanceRegister);
new AdministrationConfig(instanceRegister);
new IdeConfig(instanceRegister);

new NavbarConfig(instanceRegister);
new WorkspacesConfig(instanceRegister);
new StacksConfig(instanceRegister);
new GetStartedConfig(instanceRegister);
new FactoryConfig(instanceRegister);
new OrganizationsConfig(instanceRegister);
new TeamsConfig(instanceRegister);
new ProfileConfig(instanceRegister);
/* tslint:enable */
