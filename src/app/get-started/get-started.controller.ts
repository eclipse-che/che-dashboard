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

import { GET_STARTED } from './get-started-config';

enum TABS {
  'getStarted',
  'customWorkspace'
}

/**
 * @ngdoc controller
 * @name get.started.controller:GetStartedController
 * @description This class is handling the controller for the Get Started page
 * @author Oleksii Kurinnyi
 * @author Oleksii Orel
 */
export class GetStartedController {

  static $inject = [
    '$scope',
    '$timeout',
    '$location'
  ];

  tabs = TABS;
  selectedTabIndex = 0;

  // injected services
  private $location: ng.ILocationService

  /**
   * Default constructor that is using resource
   */
  constructor(
    $scope: ng.IScope,
    $timeout: ng.ITimeoutService,
    $location: ng.ILocationService
  ) {
    this.$location = $location;

    const updateSelectedTab = () => {
      const tab = $location.search().tab;
      if (!tab) {
        if(this.selectedTabIndex !== 0) {
          this.selectedTabIndex = 0;
        }
        return;
      }
      const tabIndex = this.tabs[tab];
      const selectedTabIndex = typeof tabIndex === 'number' ? tabIndex : 0;
      if (selectedTabIndex === this.selectedTabIndex) {
        return;
      }
      this.selectedTabIndex = selectedTabIndex;
    }
    updateSelectedTab();

    let timeoutPromise: ng.IPromise<any>;
    const onLocationChange = () => {
      if ($location.path() !== GET_STARTED) {
        return;
      }
      if (timeoutPromise) {
        $timeout.cancel(timeoutPromise);
      }
      timeoutPromise = $timeout(() => {
        updateSelectedTab();
      }, 100);
    }

    $scope.$on('$locationChangeSuccess', onLocationChange);
  }

  onSelectTab(): void {
    this.$location.search({'tab': TABS[this.selectedTabIndex]});
  }
}
