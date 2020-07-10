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

export const STORAGE_TYPE = {
  'PERSISTENT': { id: 1, label: 'Persistent', description: 'Persistent Storage slow I/O but persistent.' },
  'EPHEMERAL': { id: 2, label: 'Ephemeral', description: 'Ephemeral Storage allows for faster I/O but may have limited storage and is not persistent.' },
  'ASYNCHRONOUS': { id: 3, label: 'Asynchronous', description: 'Experimental feature: Asynchronous storage is combination of Ephemeral and Persistent storage. Allows for faster I/O and keep your changes, will backup on stop and restore on start workspace.' }
}

export enum StorageType {
  'ASYNCHRONOUS' = 'Asynchronous',
  'EPHEMERAL' = 'Ephemeral',
  'PERSISTENT' = 'Persistent',
}

export namespace StorageType {
  export function getTypeDescription(type: StorageType): string {
    switch (type) {
      case StorageType.ASYNCHRONOUS:
        return 'Experimental feature: Asynchronous storage is combination of Ephemeral and Persistent storage. Allows for faster I/O and keep your changes, will backup on stop and restore on start workspace.';
      case StorageType.EPHEMERAL:
        return 'Ephemeral Storage allows for faster I/O but may have limited storage and is not persistent.';
      case StorageType.PERSISTENT:
        return 'Persistent Storage slow I/O but persistent.';
    }
  }
  export function getAllDescriptions(): string {
    return `
      <div class="pf-c-content">
        <p>
          <b>Persistent Storage</b>
          is slow I/O but persistent.
        </p>
        <p>
          <b>Ephemeral Storage</b>
          allows for faster I/O but may have limited storage and is not
          persistent.
        </p>
        <p>
          <span style="font-size: 0.8em; color: #F37943">Experimental feature</span><br/>
          <b>Asynchronous Storage</b>
          is combination of Ephemeral and Persistent storages. It allows for
          faster I/O and keeps your changes, it does backup the workspace on
          stop and restores it on start.
        </p>
      </div>
    `;
  }
}
