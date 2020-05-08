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

import { GetStartedTabController } from './get-started-tab.controller';
import { GetStartedTabDirective } from './get-started-tab.directive';
import { GetStartedTabConfigService } from './get-started-tab-config.service';
import { GetStartedToolbarComponent } from './toolbar/get-started-toolbar.component';
import { GetStartedToolbarController } from './toolbar/get-started-toolbar.controller';
import { SampleCardDirective } from './sample-card/sample-card.directive';

// todo GettingStartedConfig

/**
 * @name getStarted:GetStartedConfig
 * @description This class is used for configuring all get started devfiles.
 * @author Oleksii Orel
 */
export class GetStartedTabConfig {

  constructor(register: che.IRegisterService) {
    register.directive('sampleCard', SampleCardDirective);
    register.controller('GetStartedTabController', GetStartedTabController);
    register.directive('getStartedTab', GetStartedTabDirective);
    register.controller('GetStartedToolbarController', GetStartedToolbarController);
    register.component('getStartedToolbar', GetStartedToolbarComponent);

    register.service('getStartedTabConfigService', GetStartedTabConfigService);
  }
}
