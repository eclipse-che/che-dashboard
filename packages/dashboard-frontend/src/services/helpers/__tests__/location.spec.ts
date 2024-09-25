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

import { Location } from 'react-router-dom';

import { toHref } from '@/services/helpers/location';

describe('location', () => {
  test('toHref', () => {
    const location: Location = {
      pathname: '/foo',
      search: '?bar=baz',
      hash: '',
      key: 'key',
      state: {},
    };
    expect(toHref(location)).toEqual(`${window.location.origin}/#/foo?bar=baz`);
  });
});
