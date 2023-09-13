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
import { helpers } from '@eclipse-che/common';
import { cheServerBaseUrl } from './const';
import { FactoryResolver } from '../helpers/types';

const factoryUrl = '/factory';

export async function getFactoryResolver(
  url: string,
  overrideParams: { [params: string]: string } = {},
): Promise<FactoryResolver> {
  try {
    const response = await axios.post(
      `${cheServerBaseUrl}${factoryUrl}/resolver`,
      Object.assign({}, overrideParams, { url }),
    );

    return response.data;
  } catch (e) {
    throw new Error(`Failed to fetch factory'. ${helpers.errors.getMessage(e)}`);
  }
}
