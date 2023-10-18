/*
 * Copyright (c) 2018-2023 Red Hat, Inc.
 * This program and the accompanying materials are made
 * available under the terms of the Eclipse Public License 2.0
 * which is available at https://www.eclipse.org/legal/epl-2.0/
 *
 * SPDX-License-Identifier: EPL-2.0
 *
 * Contributors:
 *   Red Hat, Inc. - initial API and implementation
 */

import { AxiosWrapper } from '@/services/backend-client/axiosWrapper';
import { cheServerPrefix } from '@/services/backend-client/const';

export async function getKubernetesNamespace(): Promise<che.KubernetesNamespace[]> {
  const response = await AxiosWrapper.createToRetryAnyErrors().get(
    `${cheServerPrefix}/kubernetes/namespace`,
  );

  return response.data;
}

export async function provisionKubernetesNamespace(): Promise<che.KubernetesNamespace> {
  const response = await AxiosWrapper.createToRetryAnyErrors().post(
    `${cheServerPrefix}/kubernetes/namespace/provision`,
  );

  return response.data;
}
