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

enum TABS {
  'Get Started',
  'Custom Workspace'
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
    $location: ng.ILocationService
  ) {
    this.$location = $location;

    const updateSelectedTab = () => {
      const tab = $location.search().tab;
      if (tab) {
        const tabIndex = this.tabs[tab];
        if (typeof tabIndex === 'number') {
          this.selectedTabIndex = tabIndex;
          return;
        }
      }
      $location.search({'tab': TABS[0]});
    }

    updateSelectedTab();
    $scope.$on('$locationChangeSuccess', () => {
      updateSelectedTab();
    });
  }

  onSelectTab(): void {
    this.$location.search({'tab': TABS[this.selectedTabIndex]});
  }
}
