/*
 * Copyright (c) 2018-2024 Red Hat, Inc.
 * This program and the accompanying materials are made
 * available under the terms of the Eclipse Public License 2.0
 * which is available at https://www.eclipse.org/legal/epl-2.0/
 *
 * SPDX-License-Identifier: EPL-2.0
 *
 * Contributors:
 *   Red Hat, Inc. - initial API and implementation
 */

import { helpers } from '@eclipse-che/common';

import { delay } from '@/services/helpers';
import { logger } from '@/utils/logger';

export async function retryableExec<T>(callback: () => Promise<T>, maxAttempt = 5): Promise<T> {
  let error: unknown;
  for (let attempt = 0; attempt < maxAttempt; attempt++) {
    try {
      return await callback();
    } catch (e) {
      error = e;

      const message = helpers.errors.getMessage(e);
      logger.warn(`Attempt ${attempt + 1} failed: ${message}`);

      if (helpers.errors.isKubeClientError(e) && e.statusCode === 404) {
        break;
      }

      logger.debug(e);
    }
    await delay(1000);
  }

  logger.error(error);
  throw error;
}
