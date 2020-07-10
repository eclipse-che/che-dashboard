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

export interface IChePfModalOptions {
  header?: string,
  buttons?: {
    resolve?: string;
    reject?: string;
  };
}

/**
 * todo
 */
export class ChePfModalService {

  static $inject = ['$mdDialog'];

  private $mdDialog: ng.material.IDialogService;

  constructor(
    $mdDialog: ng.material.IDialogService,
  ) {
    this.$mdDialog = $mdDialog;
  }

  showModal(content: string, options?: IChePfModalOptions): ng.IPromise<any> {
    return this.$mdDialog.show({
      bindToController: true,
      clickOutsideToClose: true,
      controller: 'ChePfModalController',
      controllerAs: 'ctrl',
      locals: {
        $mdDialog: this.$mdDialog,
        content,
        options,
      },
      templateUrl: 'components/che-pf-widget/modal/che-pf-modal.html',
    });
  }

}
