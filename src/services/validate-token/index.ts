/*
 * Copyright (c) 2018-2020 Red Hat, Inc.
 * This program and the accompanying materials are made
 * available under the terms of the Eclipse Public License 2.0
 * which is available at https://www.eclipse.org/legal/epl-2.0/
 *
 * SPDX-License-Identifier: EPL-2.0
 *
 * Contributors:
 *   Red Hat, Inc. - initial API and implementation
 */

import axios from 'axios';

export async function validateMachineToken(workspaceId: string, machineToken?: string): Promise<void> {
  try {
    await axios({
      method: 'GET',
      url: `/api/workspace/${workspaceId}`,
      headers: {
        'Authorization': machineToken ? `Bearer ${machineToken}` : undefined
      }
    });
  } catch (e) {
    if (e.status !== 304) {
      throw new Error('Failed to fetch factory resolver, ' + e);
    }
  }
}
