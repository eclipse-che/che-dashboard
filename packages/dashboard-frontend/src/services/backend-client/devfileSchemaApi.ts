/*
 * Copyright (c) 2018-2025 Red Hat, Inc.
 * This program and the accompanying materials are made
 * available under the terms of the Eclipse Public License 2.0
 * which is available at https://www.eclipse.org/legal/epl-2.0/
 *
 * SPDX-License-Identifier: EPL-2.0
 *
 * Contributors:
 *   Red Hat, Inc. - initial API and implementation
 */

import common from '@eclipse-che/common';
import axios from 'axios';

import { dashboardBackendPrefix } from '@/services/backend-client/const';

export interface DevfileSchema {
  definitions?: Record<string, unknown>;
  properties?: Record<string, unknown>;
  [key: string]: unknown;
}

export async function fetchDevfileSchema(version: string): Promise<DevfileSchema> {
  try {
    const response = await axios.get(`${dashboardBackendPrefix}/devfile`, {
      params: { version },
    });
    return response.data as DevfileSchema;
  } catch (e) {
    throw new Error(`Failed to fetch devfile schema. ${common.helpers.errors.getMessage(e)}`);
  }
}
