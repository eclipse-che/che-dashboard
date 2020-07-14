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

import { IStorageTypeRowComponentBindings } from './storage-type-row.component';
import { CheWorkspace } from '../../../../components/api/workspace/che-workspace.factory';
import { StorageType } from '../../../../components/api/storage-type';
import { IChePfSelectProperties } from '../../../../components/che-pf-widget/select/che-pf-select-typeahead.directive';
import { ChePfModalService } from '../../../../components/che-pf-widget/modal/che-pf-modal.service';

type OnChangesObject = {
  [key in keyof IStorageTypeRowComponentBindings]: ng.IChangesObject<IStorageTypeRowComponentBindings[key]>;
};

export class StorageTypeRowController implements ng.IController, IStorageTypeRowComponentBindings {

  static $inject = [
    'chePfModalService',
    'cheWorkspace',
  ];

  // component bindings
  storageType?: StorageType;
  onChangeStorageType: (eventObj: { '$storageType': StorageType; '$default': StorageType; }) => void;

  // used in template
  // debug
  allowedAsync = false;
  selectorId = 'storage-type-selector';

  // template fields
  storageSelect: IChePfSelectProperties<StorageType>;
  descriptionButtonTitle: string;

  // injected services
  private chePfModalService: ChePfModalService;
  private cheWorkspace: CheWorkspace;

  private initPromise: ng.IPromise<void>;
  private defaultStorageType: StorageType;

  constructor(
    chePfModalService: ChePfModalService,
    cheWorkspace: CheWorkspace,
  ) {
    this.chePfModalService = chePfModalService;
    this.cheWorkspace = cheWorkspace;
  }

  $onInit(): void {
    this.initPromise = this.cheWorkspace.fetchWorkspaceSettings().then(settings => this.updateStorageType(settings));

    const items = StorageType.getAllowedTypes();

    this.storageSelect = {
      config: {
        id: this.selectorId,
        items,
        placeholder: 'Select a storage template'
      },
      value: this.storageType,
      onSelect: storageType => this.onStorageTypeChanged(storageType),
    };
    this.descriptionButtonTitle = 'Learn more about storage types';
  }

  $onChanges(onChangesObj: OnChangesObject): void {
    if (!this.initPromise) {
      return;
    }
    this.initPromise.then(() => {
      if (onChangesObj.storageType.currentValue === undefined) {
        this.storageSelect.value = this.defaultStorageType;
        return;
      }
      this.storageSelect.value = onChangesObj.storageType.currentValue;
    });
  }

  showStorageTypeModal(): ng.IPromise<void> {
    const content = StorageType.getAllDescriptions();
    return this.chePfModalService.showModal(content);
  }

  onStorageTypeChanged(storageType: StorageType): void {
    this.onChangeStorageType({ '$storageType': storageType, '$default': this.defaultStorageType })
  }

  private updateStorageType(settings: che.IWorkspaceSettings): void {
    const persistVolumesDefault = settings['che.workspace.persist_volumes.default'];

    this.defaultStorageType = persistVolumesDefault === 'true'
      ? this.defaultStorageType = StorageType.PERSISTENT
      : this.defaultStorageType = StorageType.EPHEMERAL;

    if (this.storageType === undefined) {
      this.storageSelect.value = this.defaultStorageType;
    }
  }

}
