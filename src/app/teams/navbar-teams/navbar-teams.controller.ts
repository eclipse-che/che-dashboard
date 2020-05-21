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

import { CheDashboardConfigurationService } from '../../../components/branding/che-dashboard-configuration.service';

/**
 * @ngdoc controller
 * @name teams.navbar.controller:NavbarTeamsController
 * @description This class is handling the controller for the teams section in navbar
 * @author Ann Shumilova
 */
export class NavbarTeamsController {

  static $inject = [
    'cheDashboardConfigurationService',
    'cheTeam',
  ];

  /**
   * Team API interaction.
   */
  private cheTeam: che.api.ICheTeam;

  private cheDashboardConfigurationService: CheDashboardConfigurationService;

  /**
   * Default constructor
   */
  constructor(
    cheDashboardConfigurationService: CheDashboardConfigurationService,
    cheTeam: che.api.ICheTeam,
  ) {
    this.cheDashboardConfigurationService = cheDashboardConfigurationService;
    this.cheTeam = cheTeam;
  }

  $onInit(): void {
    if (this.cheDashboardConfigurationService.allowedMenuItem('organizations')) {
      this.fetchTeams();
    }
  }

  /**
   * Fetch the list of available teams.
   */
  fetchTeams(): ng.IPromise<any> {
    return this.cheTeam.fetchTeams();
  }

  getTeamDisplayName(team: any): string {
    return this.cheTeam.getTeamDisplayName(team);
  }

  /**
   * Get the list of available teams.
   *
   * @returns {Array<any>} teams array
   */
  getTeams(): Array<any> {
    return this.cheTeam.getTeams();
  }

  /**
   * Returns personal account of current user.
   *
   * @returns {any} personal account
   */
  getPersonalAccount(): any {
    return this.cheTeam.getPersonalAccount();
  }
}
