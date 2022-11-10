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

import { api } from '@eclipse-che/common';
import * as k8s from '@kubernetes/client-node';
import { IUserProfileApi } from '../types';
import { createError } from './helpers/createError';
import { CoreV1API, prepareCoreV1API } from './helpers/prepareCoreV1API';

const ERROR_LABEL = 'CORE_V1_API_ERROR';
const USER_PROFILE_SECRET_NAME = 'user-profile';

export class UserProfileApiService implements IUserProfileApi {
  private readonly coreV1API: CoreV1API;

  constructor(kc: k8s.KubeConfig) {
    this.coreV1API = prepareCoreV1API(kc);
  }

  async getUserProfile(namespace: string): Promise<api.IUserProfile | undefined> {
    try {
      const result = await this.coreV1API.readNamespacedSecret(USER_PROFILE_SECRET_NAME, namespace);
      const data = result.body.data;
      if (data === undefined) {
        throw new Error('Data is empty');
      }
      return {
        username: Buffer.from(data.name, 'base64').toString(),
        email: Buffer.from(data.email, 'base64').toString(),
      };
    } catch (e) {
      console.error('Unable to get user profile data:', e);
      throw createError(e, ERROR_LABEL, 'Unable to get user profile data');
    }
  }
}
