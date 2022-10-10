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

import { deletePolicy, deletionOptions } from '../models';

test('models', () => {
  const opts = deletionOptions(deletePolicy.Background);
  expect(opts).toEqual({
    apiVersion: 'v1',
    kind: 'DeleteOptions',
    propagationPolicy: 'Background',
  });
});
