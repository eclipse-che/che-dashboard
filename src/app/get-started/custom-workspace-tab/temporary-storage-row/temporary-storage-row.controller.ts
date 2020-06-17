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

import { ITemporaryStorageRowComponentBindings } from './temporary-storage-row.component';
import { CheWorkspace } from '../../../../components/api/workspace/che-workspace.factory';
import { IChePfSwitchProperties } from '../../../../components/che-pf-widget/switch/che-pf-switch.directive';
import { IChePfSelectProperties, IChePfSelectItem } from '../../../../components/che-pf-widget/select/che-pf-select-typeahead.directive';
import { STORAGE_TYPE } from '../../../../components/api/storage-type';

type OnChangesObject = {
  [key in keyof ITemporaryStorageRowComponentBindings]: ng.IChangesObject<ITemporaryStorageRowComponentBindings[key]>;
};

export class TemporaryStorageRowController implements ng.IController, ITemporaryStorageRowComponentBindings {

  static $inject = [
    'cheWorkspace',
  ];

  // component bindings
  storageType?: string
  onChangeStorageType: (eventObj: { $storageType: string; $default: boolean; }) => void;
  storageDescription?: string
  // init promise
  initPromise: ng.IPromise<string>;
  // template fields
  temporaryStorageSwitch: IChePfSwitchProperties;
  storageSelect: IChePfSelectProperties<string>;
  // injected services
  private cheWorkspace: CheWorkspace;

  constructor(cheWorkspace: CheWorkspace) {
    this.cheWorkspace = cheWorkspace;
    this.storageSelect = {
      config: {
        items: [STORAGE_TYPE.PERSISTANT.label, STORAGE_TYPE.EPHEMERAL.label, STORAGE_TYPE.ASYNCHRONUS.label],
        placeholder: 'Select a storgae template'
      },
      value: STORAGE_TYPE.EPHEMERAL.label,
      onSelect: value => {
        console.log(value)
        this.onSelected(value)
      },
    };
  }

  $onInit(): void {
    this.initPromise = this.cheWorkspace.fetchWorkspaceSettings()
      .then(settings => {
        return this.updateStorageType(settings['che.workspace.persist_volumes.default']);
      });
  }

  $onChanges(onChangesObj: OnChangesObject): void {
    this.initPromise.then((persistVolumesDefault: string) => {
      if (onChangesObj.storageType.currentValue === undefined && persistVolumesDefault) {
        if (persistVolumesDefault === 'false') {
          this.storageSelect.value = STORAGE_TYPE.EPHEMERAL.label;
          return;
        }
      }
      this.storageSelect.value = onChangesObj.storageType.currentValue;
      this.storageDescription
    });
  }

  private updateStorageType(persistVolumesDefault: string): string {
    if (this.storageType === undefined) {
      if (persistVolumesDefault === 'false') {
        this.storageSelect.value = STORAGE_TYPE.EPHEMERAL.label;
      } else {
        this.storageSelect.value = STORAGE_TYPE.PERSISTANT.label;
      }
    } else {
      this.storageSelect.value = this.storageType;
    }
    return persistVolumesDefault;
  }

  private async  onSelected(value: string) {
    const persistVolumeDefault = await this.initPromise;
    switch (value) {
      case STORAGE_TYPE.EPHEMERAL.label: 
        this.storageDescription = STORAGE_TYPE.EPHEMERAL.description;
        break;
      case STORAGE_TYPE.PERSISTANT.label:
        this.storageDescription = STORAGE_TYPE.PERSISTANT.description;
        break;
      case STORAGE_TYPE.ASYNCHRONUS.label:
        this.storageDescription = STORAGE_TYPE.ASYNCHRONUS.description;
        break;    
    }
    this.onChangeStorageType({ '$storageType': value, '$default': persistVolumeDefault === 'false' });
  }
}
