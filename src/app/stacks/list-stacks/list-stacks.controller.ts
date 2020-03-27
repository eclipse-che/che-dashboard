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
import { CheWorkspace } from '../../../components/api/workspace/che-workspace.factory';
import {DevfileRegistry, IDevfileMetaData} from '../../../components/api/devfile-registry.factory';
import {CheNotification} from '../../../components/notification/che-notification.factory';

const DEFAULT_COLUMN = 'displayName';

/**
 * @ngdoc controller
 * @name stacks.list.controller:ListStacksCtrl
 * @description This class is handling the controller for listing the stacks
 * @author Ann Shumilova
 * @author Oleksii Orel
 */
export class ListStacksController {

  static $inject = ['$scope',
    '$location',
    'cheWorkspace',
    'devfileRegistry',
    'cheListHelperFactory',
    '$log',
    'cheNotification'];

  private $location: ng.ILocationService;
  private devfileRegistry: DevfileRegistry;
  private cheListHelper: che.widget.ICheListHelper;
  private $log: ng.ILogService;
  private cheNotification: CheNotification;
  private cheWorkspace: CheWorkspace;

  private orderBy: string;
  private searchBy: string;
  private searchStr: string;
  private isLoading: boolean;

  /**
   * Default constructor that is using resource
   */
  constructor($scope: ng.IScope,
              $location: ng.ILocationService,
              cheWorkspace: CheWorkspace,
              devfileRegistry: DevfileRegistry,
              cheListHelperFactory: che.widget.ICheListHelperFactory,
              $log: ng.ILogService,
              cheNotification: CheNotification) {
    this.$location = $location;
    this.devfileRegistry = devfileRegistry;
    this.$log = $log;
    this.cheNotification = cheNotification;
    this.cheWorkspace = cheWorkspace;

    const helperId = 'devfiles-meta-list';
    this.cheListHelper = cheListHelperFactory.getHelper(helperId);
    $scope.$on('$destroy', () => {
      cheListHelperFactory.removeHelper(helperId);
    });

    this.orderBy = DEFAULT_COLUMN;
    //
    this.searchBy = '$';

    this.loadDevfiles();
  }

  $onInit(): void {
    // this method won't be called here
    // place all initialization code in constructor
  }

  loadDevfiles(): void {
    this.isLoading = true;
    this.cheWorkspace.fetchWorkspaceSettings()
      .then(settings => {
        const urls = settings.cheWorkspaceDevfileRegistryUrl;

        if (!urls) {
          throw new Error('"cheWorkspaceDevfileRegistryUrl" is not set.');
        }
        return urls;
      })
      .then(urls => this.devfileRegistry.fetchDevfiles(urls))
      .then(
        devfiles => this.cheListHelper.setList(devfiles, 'displayName'),
        error => {
          const message = 'Failed to load devfiles meta list.';
          this.cheNotification.showError(message);
          this.$log.error(message, error);
        }
      ).finally(() => this.isLoading = false);
  }

  onSearchChanged(searchStr: string): void {
    this.searchStr = searchStr;
    this.updateFilters();
  }

  onDevfileSelected(devfile: IDevfileMetaData): void {
    if (devfile.links && devfile.links.self) {
      this.$location.path(`/stack/${this.devfileRegistry.selfLinkToDevfileId(devfile.links.self)}`).search({});
    }
  }

  updateFilters(): void {
    this.cheListHelper.clearFilters();
    const filter: { [searchBy: string]: string } = {};
    if (this.searchStr) {
      filter[this.searchBy] = this.searchStr;
    }
    this.cheListHelper.applyFilter(this.searchBy, filter);
  }
}
