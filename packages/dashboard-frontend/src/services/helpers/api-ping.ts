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

import axios from 'axios';
import common, { helpers } from '@eclipse-che/common';
import { delay } from './delay';

const MAX_ATTEMPT_QUANTITY = 12;
const DELAY_TIME = 2500;

export async function isAvailableEndpoint(url: string | undefined): Promise<boolean> {
  if (!url) {
    return false;
  }
  let attempt = 0;
  while (attempt < MAX_ATTEMPT_QUANTITY) {
    attempt++;
    try {
      await axios.get(url);
      return true;
    } catch (error) {
      if (
        common.helpers.errors.includesAxiosResponse(error) &&
        (error.response?.status === 404 || error.response?.status === 503)
      ) {
        if (attempt === MAX_ATTEMPT_QUANTITY) {
          console.error(`Endpoint '${url}' is not available. ${helpers.errors.getMessage(error)}`);
          return false;
        }
        await delay(DELAY_TIME);
      } else {
        return true;
      }
    }
  }

  return false;
}
