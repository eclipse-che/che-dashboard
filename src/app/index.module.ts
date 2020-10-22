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
import { StorageTypeService } from '../components/service/storage-type/storage-type.service';
import { keycloakSetup } from './keycloak-setup';

// development mode
const DEV = false;

// init module
const initModule = angular.module('userDashboard', ['ngAnimate', 'ngCookies', 'ngTouch', 'ngSanitize', 'ngResource', 'ngRoute',
  'angular-websocket', 'ui.bootstrap', 'ngMaterial', 'ngMessages', 'angularMoment', 'angular.filter',
  'ngLodash', 'uuid4', 'angularFileUpload', 'ui.gravatar']);

// register singletons which can be used before resumeBootstrap
const cheBranding = CheBranding.get();
initModule.constant('cheBranding', cheBranding);

window.name = 'NG_DEFER_BOOTSTRAP!';

function showErrorMessage(error: Error) {
  const footerLogo = document.createElement('img');
  footerLogo.src = cheBranding.getProductLogo();
  footerLogo.className = "footer-logo";

  const errorMessage = document.createElement('div');
  errorMessage.innerHTML = error.message;

  const messageArea = document.createElement('div');
  messageArea.className = 'prebootstrap-error-container';
  messageArea.appendChild(errorMessage);

  const backdrop = document.createElement('div');
  backdrop.className = 'prebootstrap-error-backdrop';
  backdrop.appendChild(messageArea);
  backdrop.appendChild(footerLogo);

  document.querySelector('.main-page-loader').appendChild(backdrop);
}

const keycloakAuth = {
  isPresent: false,
  keycloak: null,
  config: null
};
initModule.constant('keycloakAuth', keycloakAuth);

angular.element(() => {
  const keycloakSetupPromise = keycloakSetup(cheBranding, DEV);
  const brandingReadyPromise = cheBranding.ready
    .catch(errorMessage => {
      const message = `
          <div class="header"><i class="fa fa-warning"></i><p>Resource Loading Error</p></div>
          <div class="body">
            <p>${errorMessage}</p>
            <p>Please try <kbd>Shift</kbd>+<kbd>Refresh</kbd> or contact cluster admin if it didn't help.</p>
          </div>
        `;
      return Promise.reject({ message });
    });

  Promise.all([brandingReadyPromise, keycloakSetupPromise]).then(([_cheBranding, _keycloakAuth]) => {
    Object.assign(keycloakAuth, _keycloakAuth);
    (angular as any).resumeBootstrap();
  }).catch(error => {
    showErrorMessage(error);
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
  'storageTypeService',
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
    storageTypeService: StorageTypeService,
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
    storageTypeService;
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
