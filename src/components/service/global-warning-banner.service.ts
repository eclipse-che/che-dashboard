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

const STORAGE_KEY = 'ud_hidden_warnings';

/**
 * This service handles warning messages to show them in a banner.
 * @author Oleksii Kurinnyi
 */
export class GlobalWarningBannerService {

  static $inject = [
    '$rootScope',
  ];

  private $rootScope: che.IRootScopeService;

  private hiddenMessages: string[];
  private messages: string[];

  constructor(
    $rootScope: che.IRootScopeService,
  ) {
    this.$rootScope = $rootScope;

    this.$rootScope.globalWarningMessages = [];
    this.messages = this.$rootScope.globalWarningMessages;
    this.$rootScope.showGlobalWarningBanner = false;
    this.$rootScope.closeGlobalWarningMessage = (message: string) => this.clearMessage(message);

    this.readHiddenMessages();
  }

  addMessage(message: string): void {
    if (this.hiddenMessages.indexOf(message) !== -1) {
      return;
    }
    this.messages.push(message);

    this.showBanner();
  }

  clearMessage(message: string): void {
    const index = this.messages.indexOf(message);
    if (index === -1) {
      return;
    }
    this.messages.splice(index, 1);

    this.hiddenMessages.push(message);
    this.saveHiddenMessages();

    if (this.messages.length === 0) {
      this.hideBanner();
    }
  }

  clearAllMessages(): void {
    this.messages.length = 0;

    this.hideBanner();
  }

  private showBanner(): void {
    this.$rootScope.showGlobalWarningBanner = true;
  }

  private hideBanner(): void {
    this.$rootScope.showGlobalWarningBanner = false;
  }

  private saveHiddenMessages(): void {
    const hiddenMessages = angular.toJson(this.hiddenMessages);
    window.sessionStorage.setItem(STORAGE_KEY, hiddenMessages)
  }

  private readHiddenMessages(): void {
    const hiddenMessages = window.sessionStorage.getItem(STORAGE_KEY) || '[]';
    this.hiddenMessages = angular.fromJson(hiddenMessages);
  }

}
