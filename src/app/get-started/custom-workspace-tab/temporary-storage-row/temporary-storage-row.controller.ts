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

export class TemporaryStorageRowController implements ITemporaryStorageRowComponentBindings {

  static $inject = [
    'cheWorkspace',
  ];

  // component bindings
  onChange: (eventObj: { $temporary: boolean }) => void;

  // template fields
  temporaryStorageSwitch: IChePfSwitchProperties;

  // injected services
  private cheWorkspace: CheWorkspace;

  constructor(
    cheWorkspace: CheWorkspace,
  ) {
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
    this.cheWorkspace.fetchWorkspaceSettings()
      .then(settings => this.updateTemporaryStorage(settings['che.workspace.persist_volumes.default']));
  }

  private updateTemporaryStorage(persistVolumesDefault: string): void {
    const temporary = persistVolumesDefault === 'false';
    this.temporaryStorageSwitch.value = temporary;
  }

  private onChanged(temporary: boolean): void {
    this.onChange({ '$temporary': temporary });
  }

}
