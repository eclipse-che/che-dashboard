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

import { CheWorkspace } from '../../api/workspace/che-workspace.factory';
import { CheBranding } from '../../branding/che-branding';

export enum StorageType {
  async = 'Asynchronous',
  ephemeral = 'Ephemeral',
  persistent = 'Persistent',
}

export class StorageTypeService {

  static $inject = [
    'cheBranding',
    'cheWorkspace',
  ];

  private cheBranding: CheBranding;
  private cheWorkspace: CheWorkspace;

  private readyPromise: ng.IPromise<void>;
  private settings: che.IWorkspaceSettings;

  constructor(
    cheBranding: CheBranding,
    cheWorkspace: CheWorkspace,
  ) {
    this.cheBranding = cheBranding;
    this.cheWorkspace = cheWorkspace;

    this.readyPromise = this.cheWorkspace.fetchWorkspaceSettings()
      .then(settings => {
        this.settings = settings;
      });
  }

  get ready(): ng.IPromise<void> {
    return this.readyPromise;
  }

  getAvailableTypes(): StorageType[] {
    const availableTypes = this.settings['che.workspace.storage.available_types'];
    return availableTypes.split(',') as StorageType[];
  }

  getPreferredType(): StorageType {
    return StorageType[this.settings['che.workspace.storage.preferred_type']];
  }

  getTextDescription(type: StorageType): string {
    switch (type) {
      case StorageType.async:
        return 'Experimental feature: Asynchronous storage is combination of Ephemeral and Persistent storage. Allows for faster I/O and keep your changes, will backup on stop and restore on start workspace.';
      case StorageType.ephemeral:
        return 'Ephemeral Storage allows for faster I/O but may have limited storage and is not persistent.';
      case StorageType.persistent:
        return 'Persistent Storage is slow I/O but persistent.';
    }
  }

  getHtmlDescriptions(types: StorageType[]): string {
    const showAsync = types.some(type => StorageType[type] === StorageType.async);
    const showPersistent = types.some(type => StorageType[type] === StorageType.persistent);
    const showEphemeral = types.some(type => StorageType[type] === StorageType.ephemeral);

    return `
      <div class="pf-c-content">
        ${ showPersistent
        ? `<p>
            <b>Persistent Storage</b>
            is slow I/O but persistent.
          </p>`
        : ''
        }
        ${ showEphemeral
        ? `<p>
            <b>Ephemeral Storage</b>
            allows for faster I/O but may have limited storage and is not
            persistent.
          </p>`
        : ''
        }
        ${ showAsync
        ? `<p>
            <span class="experimental-storage-type"> Experimental feature </span><br/>
            <b>Asynchronous Storage </b>
            is combination of Ephemeral and Persistent storages.It allows for
            faster I / O and keeps your changes, it does backup the workspace on
            stop and restores it on start.
          </p>`
        : ''
        }
        <p>
          <a target="_blank" href="${this.cheBranding.getDocs().storageTypes}">Open documentation page</a>
        </p>
      </div>
    `;
  }

}
