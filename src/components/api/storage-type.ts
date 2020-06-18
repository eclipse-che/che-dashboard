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
    'EPHEMERAL': { id: 2, label: 'Ephemeral', description: 'Ephemeral Storage allows for faster I/O but may have limited storage and is not persistent.'},
    'ASYNCHRONOUS': { id: 3, label: 'Asynchronus', description: 'Experimental feature: Asynchronous this is combination of Ephemeral and Persistent storage. Allows for faster I/O and keep your changes, will backup on stop and restore on start workspace.' }
  }
