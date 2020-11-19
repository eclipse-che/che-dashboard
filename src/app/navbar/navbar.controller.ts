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
import { CheAPI } from '../../components/api/che-api.factory';
import { CheKeycloak } from '../../components/api/che-keycloak.factory';
import { CheService } from '../../components/api/che-service.factory';
import { CheDashboardConfigurationService } from '../../components/branding/che-dashboard-configuration.service';
import { CheNotification } from '../../components/notification/che-notification.factory';

type ConfigurableMenu = { [key in che.ConfigurableMenuItem]: string };

const CONFIGURABLE_MENU: ConfigurableMenu = {
  administration: '#/administration',
  factories: '#/factories',
  getstarted: '#/getstarted',
  organizations: '#/organizations',
  stacks: '#/stacks',
};

export const MENU_ITEM = angular.extend({
  account: '#/account',
  usermanagement: '#/admin/usermanagement',
  workspaces: '#/workspaces',
}, CONFIGURABLE_MENU);

export class CheNavBarController {

  static $inject = [
    '$document',
    '$location',
    '$scope',
    '$window',
    'cheAPI',
    'cheDashboardConfigurationService',
    'cheKeycloak',
    'cheNotification',
    'chePermissions',
    'cheService',
  ];

  menuItemUrl = MENU_ITEM;

  accountItems = [
    {
      name: 'Account',
      onclick: () => {
        this.gotoProfile();
      }
    },
    {
      // default item name, it's updated in the constructor
      name: 'Copy Login Command',
      onclick: () => {
        this.copyLoginCommand();
      }
    },
    {
      name: 'Logout',
      onclick: () => {
        this.logout();
      }
    }
  ];

  private $document: ng.IDocumentService;
  private $location: ng.ILocationService;
  private $scope: ng.IScope;
  private $window: ng.IWindowService;
  private cheAPI: CheAPI;
  private cheDashboardConfigurationService: CheDashboardConfigurationService;
  private cheKeycloak: CheKeycloak;
  private cheNotification: CheNotification;
  private chePermissions: che.api.IChePermissions;
  private cheService: CheService;

  private profile: che.IProfile;
  private userServices: che.IUserServices;
  private hasPersonalAccount: boolean;
  private organizations: Array<che.IOrganization>;
  private isPermissionServiceAvailable: boolean;
  private isKeycloackPresent: boolean;

  private workspacesNumber: number;
  private pageFactories: Array<che.IFactory> = [];

  /**
   * Default constructor
   */
  constructor(
    $document: ng.IDocumentService,
    $location: ng.ILocationService,
    $scope: ng.IScope,
    $window: ng.IWindowService,
    cheAPI: CheAPI,
    cheDashboardConfigurationService: CheDashboardConfigurationService,
    cheKeycloak: CheKeycloak,
    cheNotification: CheNotification,
    chePermissions: che.api.IChePermissions,
    cheService: CheService,
  ) {
    this.$document = $document;
    this.$location = $location;
    this.$scope = $scope;
    this.$window = $window;
    this.cheAPI = cheAPI;
    this.cheDashboardConfigurationService = cheDashboardConfigurationService;
    this.cheKeycloak = cheKeycloak;
    this.cheNotification = cheNotification;
    this.chePermissions = chePermissions;
    this.cheService = cheService;

    // update the default menu item name with a CLI tool name
    this.accountItems[1].name = `Copy ${cheDashboardConfigurationService.getCliTool()} Login Command`;

    const handler = (workspaces: Array<che.IWorkspace>) => {
      this.workspacesNumber = workspaces.length;
    };
    this.cheAPI.getWorkspace().addListener('onChangeWorkspaces', handler);

    $scope.$on('$destroy', () => {
      this.cheAPI.getWorkspace().removeListener('onChangeWorkspaces', handler);
    });
  }

  $onInit(): void {
    this.isKeycloackPresent = this.cheKeycloak.isPresent();
    this.profile = this.cheAPI.getProfile().getProfile();
    this.userServices = this.chePermissions.getUserServices();

    // highlight navbar menu item
    this.$scope.$on('$locationChangeStart', () => {
      let path = '#' + this.$location.path();
      this.$scope.$broadcast('navbar-selected:set', path);
    });

    this.cheAPI.getWorkspace().fetchWorkspaces().then((workspaces: Array<che.IWorkspace>) => {
      this.workspacesNumber = workspaces.length;
    });

    if (this.cheDashboardConfigurationService.allowedMenuItem('factories')) {
      this.cheAPI.getFactory().fetchFactories().then(() => {
        this.pageFactories = this.cheAPI.getFactory().getPageFactories();
      }).catch(() => {
        // fetch unhandled rejection
      });
    }

    this.isPermissionServiceAvailable = false;
    this.resolvePermissionServiceAvailability().then((isAvailable: boolean) => {
      this.isPermissionServiceAvailable = isAvailable;
      if (isAvailable) {
        if (this.chePermissions.getSystemPermissions()) {
          this.updateData();
        } else {
          this.chePermissions.fetchSystemPermissions()
            .catch(() => {
              // fetch unhandled rejection
            })
            .finally(() => {
              this.updateData();
            });
        }
      }
    });
  }

  /**
   * Resolves promise with <code>true</code> if Permissions service is available.
   *
   * @returns {ng.IPromise<boolean>}
   */
  resolvePermissionServiceAvailability(): ng.IPromise<boolean> {
    return this.cheService.fetchServices().then(() => {
      return this.cheService.isServiceAvailable(this.chePermissions.getPermissionsServicePath());
    });
  }

  /**
   * Update data.
   */
  updateData(): void {
    if (this.showOrganizationsItem()) {
      const organization = this.cheAPI.getOrganization();
      organization.fetchOrganizations().then(() => {
        this.organizations = organization.getOrganizations();
        const user = this.cheAPI.getUser().getUser();
        organization.fetchOrganizationByName(user.name)
          .catch(() => {
            // fetch unhandled rejection
          })
          .finally(() => {
            this.hasPersonalAccount = angular.isDefined(organization.getOrganizationByName(user.name));
          });
      });
    }
  }

  /**
   * Returns user nickname.
   * @return {string}
   */
  getUserName(): string {
    const { attributes, email } = this.profile;
    const fullName = this.cheAPI.getProfile().getFullName(attributes).trim();

    return fullName ? fullName : email;
  }

  /**
   * Returns number of factories.
   * @return {number}
   */
  getFactoriesNumber(): number {
    return this.pageFactories.length;
  }

  /**
   * Returns number of all organizations.
   * @return {number}
   */
  getOrganizationsNumber(): number {
    if (!this.organizations) {
      return 0;
    }

    return this.organizations.length;
  }

  /**
   * Returns number of root organizations.
   * @return {number}
   */
  getRootOrganizationsNumber(): number {
    if (!this.organizations) {
      return 0;
    }
    let rootOrganizations = this.organizations.filter((organization: any) => {
      return !organization.parent;
    });

    return rootOrganizations.length;
  }

  showMenuItem(menuItem: che.ConfigurableMenuItem): boolean {
    return this.cheDashboardConfigurationService.allowedMenuItem(menuItem);
  }

  showOrganizationsItem(): boolean {
    return this.showMenuItem('organizations');
  }

  showAdministrationSection(): boolean {
    return this.showOrganizationsItem() && (this.userServices.hasInstallationManagerService || this.userServices.hasAdminUserService);
  }

  /**
   * Opens user profile in new browser page.
   */
  private gotoProfile(): void {
    this.$location.path('/account').search({});
  }

  /**
   * Copies login command in clipboard.
   */
  private copyLoginCommand(): void {
    const loginCommand = this.getLoginCommand();
    try {
      const copyToClipboardEl = this.$window.document.createElement('span');
      const bodyEl = this.$document.find('body');
      copyToClipboardEl.appendChild(document.createTextNode(loginCommand));
      copyToClipboardEl.id = 'copy-to-clipboard';
      angular.element(bodyEl.append(copyToClipboardEl));

      const range = this.$window.document.createRange();
      range.selectNode(copyToClipboardEl);
      this.$window.getSelection().removeAllRanges();
      this.$window.getSelection().addRange(range);

      this.$window.document.execCommand('copy');
      this.$window.getSelection().removeAllRanges();
      copyToClipboardEl.remove();

      this.cheNotification.showSuccess('The login command copied to clipboard.');
    } catch (e) {
      console.error('Failed to put login to clipboard. Error: ', e);

      this.cheNotification.showWarning('Failed to put login command to clipboard.');

      const messageId = 'refresh-token-message';
      const linkButtonId = 'refresh-token-show-button';
      const tokenBoxId = 'refresh-token-box';
      const hiddenCssClass = 'refresh-token--hidden';
      this.cheNotification.showInfo(`
        <script>
          $('#${linkButtonId}').on('click', (e) => {
            e.preventDefault();
            // show token box
            const tokenBoxEl = document.querySelector('#${tokenBoxId}');
            tokenBoxEl.classList.remove('${hiddenCssClass}');
            // hide info message
            const messageEl = document.querySelector('#${messageId}');
            messageEl.classList.add('${hiddenCssClass}');
            return false;
          });
        </script>
        <div>
          <div id="${messageId}"><a id="${linkButtonId}">Click here</a> to see the login command and copy it manually.</div>
          <pre id="${tokenBoxId}" class="${hiddenCssClass}">${loginCommand}</pre>
        </div>
        `, { title: 'Login command', delay: 20000 });
    }
  }

  private getLoginCommand(): string {
    const host = this.$window.location.host;
    const token = this.cheKeycloak.refreshToken;
    return `chectl auth:login ${host} -t ${token}`;
  }

  /**
   * Logout.
   */
  private logout(): void {
    this.cheKeycloak.logout();
  }

}
