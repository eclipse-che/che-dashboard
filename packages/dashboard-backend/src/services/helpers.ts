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

import { authenticationHeaderSchema } from '../constants/schemas';
import { ISchemaParams } from 'models';

export async function delay(ms: number = 500): Promise<void> {
  await new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

export function getSchema(additionalParams: ISchemaParams): { schema: ISchemaParams } {
  const schema = Object.assign({
    headers: authenticationHeaderSchema
  }, additionalParams);

  return { schema };
}
