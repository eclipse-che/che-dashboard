/*
 * Copyright (c) 2018-2021 Red Hat, Inc.
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
import common, { ApplicationInfo } from '@eclipse-che/common';
import { addAuthentication } from './auth';
import { prefix } from './const';

export async function fetchClusterInfo(): Promise<ApplicationInfo> {
  const headers = addAuthentication({});
  try {
    const response = await axios.get(`${prefix}/cluster-info`, { headers });
    return response.data;
  } catch (e) {
    throw `Failed to fetch cluster information. ${common.helpers.errors.getMessage(e)}`;
  }
}
