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

type OnChangesObject = {
  [key in keyof ITemporaryStorageRowComponentBindings]: ng.IChangesObject<ITemporaryStorageRowComponentBindings[key]>;
};

export class TemporaryStorageRowController implements ng.IController, ITemporaryStorageRowComponentBindings {

  static $inject = [
    'cheWorkspace',
  ];

  // component bindings
  temporary?: boolean;
  onChange: (eventObj: { $temporary: boolean, $default: boolean }) => void;
  // init promise
  initPromise: ng.IPromise<string>;
  // template fields
  temporaryStorageSwitch: IChePfSwitchProperties;
  // injected services
  private cheWorkspace: CheWorkspace;

  constructor(cheWorkspace: CheWorkspace) {
    this.cheWorkspace = cheWorkspace;

    this.temporaryStorageSwitch = {
      config: {
        name: 'temporaryStorage',
      },
      onChange: value => {
        this.onChanged(value);
      }
    };
  }

  $onInit(): void {
    this.initPromise = this.cheWorkspace.fetchWorkspaceSettings()
      .then(settings => this.updateTemporaryStorage(settings['che.workspace.persist_volumes.default']));
  }

  $onChanges(onChangesObj: OnChangesObject): void {
    if (!onChangesObj.temporary || !this.initPromise) {
      return;
    }
    this.initPromise.then((persistVolumesDefault: string) => {
      if (onChangesObj.temporary.currentValue === undefined && persistVolumesDefault) {
        this.temporaryStorageSwitch.value = persistVolumesDefault === 'false';
        return;
      }
      this.temporaryStorageSwitch.value = onChangesObj.temporary.currentValue;
    });
  }

  private updateTemporaryStorage(persistVolumesDefault: string): string {
    if (this.temporary === undefined) {
      this.temporaryStorageSwitch.value = persistVolumesDefault === 'false';
    } else {
      this.temporaryStorageSwitch.value = this.temporary;
    }
    return persistVolumesDefault;
  }

  private async onChanged(temporary: boolean): Promise<void> {
    const persistVolumeDefault = await this.initPromise;
    this.onChange({'$temporary': temporary, $default: persistVolumeDefault === 'false'});
  }

}
