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

import { RootState } from '@/store';
import {
  selectFactoryResolver,
  selectFactoryResolverError,
} from '@/store/FactoryResolver/selectors';

describe('FactoryResolver Selectors', () => {
  const mockState = {
    factoryResolver: {
      resolver: { devfile: { metadata: { name: 'test-devfile' } } },
      error: 'Something went wrong',
    },
  } as RootState;

  it('should select the factory resolver', () => {
    const result = selectFactoryResolver(mockState);
    expect(result).toEqual(mockState.factoryResolver.resolver);
  });

  it('should select the factory resolver error', () => {
    const result = selectFactoryResolverError(mockState);
    expect(result).toEqual(mockState.factoryResolver.error);
  });
});
