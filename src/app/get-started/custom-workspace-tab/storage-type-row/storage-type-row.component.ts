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

import { StorageTypeRowController } from './storage-type-row.controller';
import { StorageType } from '../../../../components/service/storage-type.service';

export interface IStorageTypeRowBindingProperties {
  storageType?: StorageType;
  onChangeStorageType: ($storageType: StorageType) => void;
}

export interface IStorageTypeRowComponentBindings {
  storageType?: StorageType;
  onChangeStorageType: (eventObj: { $storageType: StorageType }) => void;
}

interface IStorageTypeRowComponentScopeBindings {
  bindings: { [key in keyof IStorageTypeRowComponentBindings]: string };
}

export class StorageTypeRowComponent implements ng.IComponentOptions, IStorageTypeRowComponentScopeBindings {

  templateUrl = 'app/get-started/custom-workspace-tab/storage-type-row/storage-type-row.html';
  controller = StorageTypeRowController;
  controllerAs = 'ctrl';

  bindings = {
    storageType : '<',
    onChangeStorageType: '&'
  };

}
