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

import { che } from '@/services/models';
import { RootState } from '@/store';
import {
  selectDefaultNamespace,
  selectInfrastructureNamespaces,
  selectInfrastructureNamespacesError,
} from '@/store/InfrastructureNamespaces/selectors';

describe('InfrastructureNamespaces, selectors', () => {
  const mockState = {
    infrastructureNamespaces: {
      namespaces: [
        { name: 'namespace1', attributes: { default: 'false' } },
        { name: 'namespace2', attributes: { phase: 'Active', default: 'true' } },
      ],
      error: 'Something went wrong',
    },
  } as RootState;

  it('should select the default namespace', () => {
    const result = selectDefaultNamespace(mockState);
    expect(result).toEqual({
      name: 'namespace2',
      attributes: { phase: 'Active', default: 'true' },
    } as che.KubernetesNamespace);
  });

  it('should select the first namespace if no default is found', () => {
    const stateWithoutDefault = {
      ...mockState,
      infrastructureNamespaces: {
        ...mockState.infrastructureNamespaces,
        namespaces: [{ name: 'namespace1', attributes: { phase: 'Active' } }],
      },
    } as RootState;
    const result = selectDefaultNamespace(stateWithoutDefault);
    expect(result).toEqual({
      name: 'namespace1',
      attributes: { phase: 'Active' },
    } as che.KubernetesNamespace);
  });

  it('should return an empty object if no namespaces are available', () => {
    const stateWithoutNamespaces = {
      ...mockState,
      infrastructureNamespaces: {
        ...mockState.infrastructureNamespaces,
        namespaces: [],
      },
    } as RootState;
    const result = selectDefaultNamespace(stateWithoutNamespaces);
    expect(result).toEqual({});
  });

  it('should select all infrastructure namespaces', () => {
    const result = selectInfrastructureNamespaces(mockState);
    expect(result).toEqual(mockState.infrastructureNamespaces.namespaces);
  });

  it('should select the infrastructure namespaces error', () => {
    const result = selectInfrastructureNamespacesError(mockState);
    expect(result).toEqual(mockState.infrastructureNamespaces.error);
  });
});
