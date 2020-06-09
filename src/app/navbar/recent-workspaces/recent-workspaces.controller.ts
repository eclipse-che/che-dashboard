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
import IdeSvc from '../../../app/ide/ide.service';
import { WorkspacesService } from '../../workspaces/workspaces.service';
import { CheNotification } from '../../../components/notification/che-notification.factory';
import { WorkspaceDetailsService } from '../../workspaces/workspace-details/workspace-details.service';


const MAX_RECENT_WORKSPACES_ITEMS: number = 5;

/**
 * @ngdoc controller
 * @name navbar.controller:NavbarRecentWorkspacesController
 * @description This class is handling the controller of the recent workspaces to display in the navbar
 * @author Oleksii Kurinnyi
 */
export class NavbarRecentWorkspacesController {

  static $inject = [
    'ideSvc',
    'cheWorkspace',
    '$window',
    '$log',
    '$scope',
    '$rootScope',
    'workspacesService',
    'cheNotification',
    'workspaceDetailsService'
  ];

  cheWorkspace: CheWorkspace;
  dropdownItemTempl: Array<any>;
  workspaces: Array<che.IWorkspace>;
  recentWorkspaces: Array<che.IWorkspace>;
  workspaceUpdated: Map<string, number>;
  veryRecentWorkspaceId: string;
  workspaceNameById: Map<string, string> = new Map();
  ideSvc: IdeSvc;
  $scope: ng.IScope;
  $log: ng.ILogService;
  $window: ng.IWindowService;
  $rootScope: ng.IRootScopeService;
  dropdownItems: Object;
  workspacesService: WorkspacesService;
  cheNotification: CheNotification;
  workspaceDetailsService: WorkspaceDetailsService;

  /**
   * Default constructor
   */
  constructor(
    ideSvc: IdeSvc,
    cheWorkspace: CheWorkspace,
    $window: ng.IWindowService,
    $log: ng.ILogService,
    $scope: ng.IScope,
    $rootScope: ng.IRootScopeService,
    workspacesService: WorkspacesService,
    cheNotification: CheNotification,
    workspaceDetailsService: WorkspaceDetailsService
  ) {
    this.ideSvc = ideSvc;
    this.cheWorkspace = cheWorkspace;
    this.$log = $log;
    this.$window = $window;
    this.$rootScope = $rootScope;
    this.workspacesService = workspacesService;
    this.cheNotification = cheNotification;
    this.workspaceDetailsService = workspaceDetailsService;

    // workspace updated time map by id
    this.workspaceUpdated = new Map();
    this.recentWorkspaces = [];

    this.dropdownItems = {};
    this.dropdownItemTempl = [];

    const handler = (workspaces: Array<che.IWorkspace>) => {
      this.workspaces = workspaces;
      this.updateRecentWorkspaces();
    };
    this.cheWorkspace.addListener('onChangeWorkspaces', handler);
    $scope.$on('$destroy', () => {
      this.cheWorkspace.removeListener('onChangeWorkspaces', handler);
    });

    let cleanup = $rootScope.$on('recent-workspace:set', (event: ng.IAngularEvent, workspaceId: string) => {
      this.veryRecentWorkspaceId = workspaceId;
      this.updateRecentWorkspaces();
    });
    $rootScope.$on('$destroy', () => {
      cleanup();
    });
  }

  $onInit(): void {
    this.cheWorkspace.fetchWorkspaces().then(() => {
      this.workspaces = this.cheWorkspace.getWorkspaces();
    });

    this.updateRecentWorkspaces();
    this.fetchWorkspaceSettings();
  }

  /**
   * Returns the MAX_RECENT_WORKSPACES_ITEMS constant
   * @returns {number}
   */
  get maxItemsNumber(): number {
    return MAX_RECENT_WORKSPACES_ITEMS;
  }

  /**
   * Retrieves workspace settings.
   */
  fetchWorkspaceSettings(): void {
    if (this.cheWorkspace.getWorkspaceSettings()) {
      this.prepareDropdownItemsTemplate();
    } else {
      this.cheWorkspace.fetchWorkspaceSettings().then(() => {
        this.prepareDropdownItemsTemplate();
      });
    }
  }

  /**
   * Forms the dropdown items template, based of workspace settings.
   */
  prepareDropdownItemsTemplate(): void {
    this.dropdownItemTempl = [
      // running
      {
        name: 'Stop',
        scope: 'RUNNING',
        icon: 'fa fa-stop',
        _onclick: (workspaceId: string) => {
          this.stopRecentWorkspace(workspaceId);
        }
      },
      // stopped
      {
        name: 'Run',
        scope: 'STOPPED',
        icon: 'fa fa-play',
        _onclick: (workspaceId: string) => {
          this.runRecentWorkspace(workspaceId);
        }
      },
      {
        name: 'Run in debug mode',
        scope: 'STOPPED',
        icon: 'fa fa-play',
        _onclick: (workspaceId: string) => {
          this.runRecentWorkspace(workspaceId, true);
        }
      },
      // not supported
      {
        name: 'Not supported',
        scope: '',
        icon: '',
        _onclick: () => {
          // do nothing
        }
      }
    ];
  }

  /**
   * Update recent workspaces
   */
  updateRecentWorkspaces(): void {
    this.workspaceNameById.clear();

    if (!this.workspaces || this.workspaces.length === 0) {
      this.recentWorkspaces = [];
      return;
    }

    let recentWorkspaces: Array<che.IWorkspace> = angular.copy(this.workspaces);
    let veryRecentWorkspace: che.IWorkspace;

    recentWorkspaces.sort((workspace1: che.IWorkspace, workspace2: che.IWorkspace) => {
      let recentWorkspaceId: string = this.veryRecentWorkspaceId;
      if (!veryRecentWorkspace && (recentWorkspaceId === workspace1.id || recentWorkspaceId === workspace2.id)) {
        veryRecentWorkspace = recentWorkspaceId === workspace1.id ? workspace1 : workspace2;
      }

      let updated1 = this.workspaceUpdated.get(workspace1.id);
      if (!updated1) {
        updated1 = workspace1.attributes.updated;
        if (!updated1 || recentWorkspaceId === workspace1.id) {
          updated1 = workspace1.attributes.created;
        }
        this.workspaceUpdated.set(workspace1.id, updated1);
      }

      let updated2 = this.workspaceUpdated.get(workspace2.id);
      if (!updated2) {
        updated2 = workspace2.attributes.updated;
        if (!updated2 || recentWorkspaceId === workspace2.id) {
          updated2 = workspace2.attributes.created;
        }
        this.workspaceUpdated.set(workspace2.id, updated2);
      }

      return updated2 - updated1;
    });

    if (recentWorkspaces.length > MAX_RECENT_WORKSPACES_ITEMS) {
      let pos: number = veryRecentWorkspace ? recentWorkspaces.indexOf(veryRecentWorkspace) : -1;
      if (veryRecentWorkspace && pos >= MAX_RECENT_WORKSPACES_ITEMS) {
        recentWorkspaces[MAX_RECENT_WORKSPACES_ITEMS - 1] = veryRecentWorkspace;
      }
    }
    this.recentWorkspaces = recentWorkspaces.slice(0, MAX_RECENT_WORKSPACES_ITEMS);

    recentWorkspaces.forEach((workspace: che.IWorkspace) =>
      this.workspaceNameById.set(workspace.id, this.cheWorkspace.getWorkspaceDataManager().getName(workspace))
    );
  }

  /**
   * Returns only workspaces which were opened at least once
   * @returns {Array<che.IWorkspace>}
   */
  getRecentWorkspaces(): Array<che.IWorkspace> {
    return this.recentWorkspaces;
  }

  /**
   * Returns status of workspace
   * @param workspaceId {String} workspace id
   * @returns {String}
   */
  getWorkspaceStatus(workspaceId: string): string {
    let workspace = this.cheWorkspace.getWorkspaceById(workspaceId);
    return workspace ? workspace.status : 'unknown';
  }

  /**
   * Returns name of workspace
   * @param workspaceId {String} workspace id
   * @returns {String}
   */
  getWorkspaceName(workspaceId: string): string {
    return this.workspaceNameById.get(workspaceId) || 'unknown';
  }

  /**
   * Returns true if workspace is opened in IDE
   * @param workspaceId {String} workspace id
   * @returns {boolean}
   */
  isOpen(workspaceId: string): boolean {
    return this.ideSvc.openedWorkspace && this.ideSvc.openedWorkspace.id === workspaceId;
  }

  /**
   * @param {che.IWorkspace} workspace details
   * @returns {string}
   */
  getLink(workspace: che.IWorkspace): string {
    if (this.workspacesService.isSupported(workspace)) {
      return this.getIdeLink(workspace);
    } else {
      return this.getWorkspaceDetailsLink(workspace);
    }
  }

  /**
   * Returns IDE link
   * @param {che.IWorkspace} workspace details
   * @returns {string}
   */
  getIdeLink(workspace: che.IWorkspace): string {
    return '#/ide/' + (workspace ? (workspace.namespace + '/' + this.cheWorkspace.getWorkspaceDataManager().getName(workspace)) : 'unknown');
  }

  /**
   * Returns link to page with workspace details
   * @param {che.IWorkspace} workspace details
   * @returns {string}
   */
  getWorkspaceDetailsLink(workspace: che.IWorkspace): string {
    return '#/workspace/' + workspace.namespace + '/' + this.cheWorkspace.getWorkspaceDataManager().getName(workspace);
  }

  /**
   * Builds and returns array of dropdown menu items for specified workspace
   * @param workspaceId {String} workspace id
   * @returns {*}
   */
  getDropdownItems(workspaceId: string): any {
    if (this.dropdownItemTempl.length === 0) {
      return this.dropdownItemTempl;
    }

    if (!this.dropdownItems[workspaceId]) {
      this.dropdownItems[workspaceId] = angular.copy(this.dropdownItemTempl);
    }

    const workspace = this.cheWorkspace.getWorkspaceById(workspaceId);

    // check if default environment of the workspace contains supported recipe type
    const isSupported = this.workspacesService.isSupported(workspace);
    if (isSupported) {
      const disabled = workspace && (workspace.status === 'STOPPING'),
        visibleScope = (workspace && (workspace.status === 'RUNNING' || workspace.status === 'STOPPING' || workspace.status === 'STARTING')) ? 'RUNNING' : 'STOPPED';

      this.dropdownItems[workspaceId].forEach((item: any) => {
        item.disabled = disabled;
        item.hidden = item.scope !== visibleScope;
        item.onclick = () => {
          item._onclick(workspace.id);
        };
      });
      return this.dropdownItems[workspaceId];
    } else {
      this.dropdownItems[workspaceId].forEach((item: any) => {
        item.disabled = true;
        item.hidden = item.name !== 'Not supported';
        item.onclick = () => {
          item._onclick(workspace.id);
        };
      });
      return this.dropdownItems[workspaceId];
    }
  }

  /**
   * Stops specified workspace
   * @param workspaceId {String} workspace id
   */
  stopRecentWorkspace(workspaceId: string): void {
    if (this.checkUnsavedChanges(workspaceId)) {
      this.workspaceDetailsService.notifyUnsavedChangesDialog();
      return;
    }

    this.cheWorkspace.stopWorkspace(workspaceId).then(() => {
      angular.noop();
    }, (error: any) => {
      this.$log.error(error);
      this.cheNotification.showError('Stop workspace error.', error);
    });
  }

  /**
   * Starts specified workspace
   * @param workspaceId workspace id
   * @param isDebugMode debug mode
   */
  runRecentWorkspace(workspaceId: string, isDebugMode?: boolean): void {
    if (this.checkUnsavedChanges(workspaceId)) {
      this.workspaceDetailsService.notifyUnsavedChangesDialog();
      return;
    }

    let workspace = this.cheWorkspace.getWorkspaceById(workspaceId);

    this.updateRecentWorkspace(workspaceId);

    this.cheWorkspace.startWorkspace(workspace.id, isDebugMode).catch((error: any) => {
      this.$log.error(error);
      this.cheNotification.showError('Run workspace error.', error);
    });
  }

  /**
   * Emit event to move workspace immediately
   * to top of the recent workspaces list
   *
   * @param workspaceId
   */
  updateRecentWorkspace(workspaceId: string): void {
    this.$rootScope.$broadcast('recent-workspace:set', workspaceId);
  }

  /**
   * Returns `true` if workspace configuration has unsaved changes.
   * @param id a workspace ID
   */
  checkUnsavedChanges(id: string): boolean {
    return this.workspaceDetailsService.isWorkspaceConfigSaved(id) === false;
  }

}
