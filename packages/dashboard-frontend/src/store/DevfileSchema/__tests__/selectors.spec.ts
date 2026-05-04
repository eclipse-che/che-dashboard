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

import { DevfileSchema } from '@/services/backend-client/devfileSchemaApi';
import { RootState } from '@/store';
import {
  selectDevfileSchema,
  selectDevfileSchemaError,
  selectDevfileSchemaIsLoading,
} from '@/store/DevfileSchema/selectors';

describe('DevfileSchema selectors', () => {
  const schema = { type: 'object' } as DevfileSchema;
  const mockState = {
    devfileSchema: {
      isLoading: true,
      schema,
      error: 'Something went wrong',
    },
  } as Partial<RootState> as RootState;

  it('should return the schema', () => {
    const result = selectDevfileSchema(mockState);
    expect(result).toEqual(schema);
  });

  it('should return isLoading', () => {
    const result = selectDevfileSchemaIsLoading(mockState);
    expect(result).toBe(true);
  });

  it('should return the error', () => {
    const result = selectDevfileSchemaError(mockState);
    expect(result).toBe('Something went wrong');
  });
});
