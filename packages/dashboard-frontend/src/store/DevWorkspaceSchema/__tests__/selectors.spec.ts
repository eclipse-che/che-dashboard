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
import { selectDevWorkspaceSchema } from '@/store/DevWorkspaceSchema/selectors';

describe('DevWorkspaceSchema selectors', () => {
  const schema = { type: 'object' } as DevfileSchema;
  const mockState = {
    devWorkspaceSchema: {
      isLoading: false,
      schema,
    },
  } as Partial<RootState> as RootState;

  it('should return the schema', () => {
    const result = selectDevWorkspaceSchema(mockState);
    expect(result).toEqual(schema);
  });

  it('should return undefined when schema is not loaded', () => {
    const stateWithoutSchema = {
      devWorkspaceSchema: {
        isLoading: false,
        schema: undefined,
      },
    } as Partial<RootState> as RootState;

    const result = selectDevWorkspaceSchema(stateWithoutSchema);
    expect(result).toBeUndefined();
  });
});
