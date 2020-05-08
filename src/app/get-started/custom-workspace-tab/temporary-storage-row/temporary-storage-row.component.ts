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

import { TemporaryStorageRowController } from './temporary-storage-row.controller';

export interface ITemporaryStorageRowBindingProperties {
  temporary?: boolean;
  onChange: ($temporary: boolean, $default: boolean) => void;
}

export interface ITemporaryStorageRowComponentBindings {
  temporary?: boolean;
  onChange: (eventObj: { $temporary: boolean, $default: boolean }) => void;
}

interface ITemporaryStorageRowComponentScopeBindings {
  bindings: { [key in keyof ITemporaryStorageRowComponentBindings]: string };
}

export class TemporaryStorageRowComponent implements ng.IComponentOptions, ITemporaryStorageRowComponentScopeBindings {

  templateUrl = 'app/get-started/custom-workspace-tab/temporary-storage-row/temporary-storage-row.html';
  controller = TemporaryStorageRowController;
  controllerAs = 'ctrl';

  bindings = {
    onChange: '&',
    temporary: '<?'
  };

}
