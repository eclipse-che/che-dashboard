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

import { GetStartedController } from './get-started.controller';
import { GetStartedTabConfigService } from './get-started-tab/get-started-tab-config.service';
import { GetStartedTabConfig } from './get-started-tab/get-started-tab-config';
import { CustomWorkspaceTabConfig } from './custom-workspace-tab/custom-workspace-tab-config';
import { CheWorkspace } from '../../components/api/workspace/che-workspace.factory';
import { MENU_ITEM } from '../navbar/navbar.controller';

export class GetStartedConfig {

  constructor(register: che.IRegisterService) {

    new GetStartedTabConfig(register); // tslint:disable-line
    new CustomWorkspaceTabConfig(register); // tslint:disable-line

    register.controller('GetStartedController', GetStartedController);

    // config routes
    register.app.config(['$routeProvider', ($routeProvider: any) => {
      $routeProvider.accessWhen('/getstarted', {
        title: 'Get Started',
        templateUrl: 'app/get-started/get-started.html',
        controller: 'GetStartedController',
        controllerAs: 'getStartedController',
        resolve: {
          initData: ['getStartedTabConfigService', (svc: GetStartedTabConfigService) => {
            return svc.allowGetStartedRoutes();
          }]
        }
      });

      $routeProvider.accessWhen('/', {
        resolve: {
          initData: ['$window', 'cheWorkspace', ($window: ng.IWindowService, cheWorkspace: CheWorkspace) => {
            let url = '/getstarted?tab=Get%20Started';
            cheWorkspace.fetchWorkspaces().then(() => {
              if (cheWorkspace.getWorkspaces().length > 0) {
                url = '/workspaces';
              }
            }).finally(() => {
              $window.open(`#${url}`, '_self');
            })
          }]
        }
      });
    }]);
  }
}
