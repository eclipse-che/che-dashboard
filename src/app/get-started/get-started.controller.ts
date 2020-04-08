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

/**
 * @ngdoc controller
 * @name get.started.controller:GetStartedController
 * @description This class is handling the controller for the Get Started page
 * @author Oleksii Kurinnyi
 */
export class GetStartedController {

  static $inject = [
    '$location'
  ];

  TABS: string[];
  GET_STARTED = 'Get Started';
  CUSTOM_WORKSPACE = 'Custom Workspace';

  tabs: { [key: string]: string | number };
  selectedTabIndex = 0;
  mastheadTitles: { [tabId: number]: string };

  // injected services

  /**
   * Default constructor that is using resource
   */
  constructor(
    $location: ng.ILocationService
  ) {
    this.initTabs();
  }

  onSelectTab(tabIndex: number): void {
    console.log('>>> tab selected:', tabIndex);
    this.selectedTabIndex = tabIndex;
  }

  initTabs(): void {
    console.log('>>> initTabs');
    this.tabs = {
      [this.GET_STARTED]: 0,
      [this.CUSTOM_WORKSPACE]: 1
    };
    this.selectedTabIndex = 1;
  }

}
