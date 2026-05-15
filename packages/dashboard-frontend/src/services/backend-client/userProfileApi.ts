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

import common, { api } from '@eclipse-che/common';

import { AxiosWrapper } from '@/services/axios-wrapper/axiosWrapper';
import { cheServerPrefix } from '@/services/backend-client/const';

/**
 * Returns object with user profile data.
 */
export async function fetchUserProfile(): Promise<api.IUserProfile> {
  const url = `${cheServerPrefix}/user`;
  try {
    const response = await AxiosWrapper.createToRetryAnyErrors().get(url);
    const data = response.data;
    return { username: data.name, email: data.email };
  } catch (e) {
    throw new Error(
      `Failed to fetch the user profile data. ${common.helpers.errors.getMessage(e)}`,
    );
  }
}
