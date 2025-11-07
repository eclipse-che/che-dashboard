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

import { RootState } from '@/store';
import {
  EXCLUDED_TARGET_EDITOR_NAMES,
  selectEditors,
  selectPlugins,
  selectPluginsError,
  selectPluginsState,
} from '@/store/Plugins/chePlugins/selectors';

describe('Plugins Selectors', () => {
  const mockState = {
    plugins: {
      plugins: [
        { id: 'plugin1', type: 'Che Plugin', name: 'Plugin 1' },
        { id: 'plugin2', type: 'Che Editor', name: 'Editor 1' },
        { id: 'plugin3', type: 'Che Editor', name: 'Editor 2' },
      ],
      error: 'Something went wrong',
    },
  } as RootState;

  it('should select the plugins state', () => {
    const result = selectPluginsState(mockState);
    expect(result).toEqual(mockState.plugins);
  });

  it('should select plugins excluding Che Editor', () => {
    const result = selectPlugins(mockState);
    expect(result).toEqual([{ id: 'plugin1', type: 'Che Plugin', name: 'Plugin 1' }]);
  });

  it('should select editors excluding those in EXCLUDED_TARGET_EDITOR_NAMES', () => {
    EXCLUDED_TARGET_EDITOR_NAMES.push('Editor 2');
    const result = selectEditors(mockState);
    expect(result).toEqual([{ id: 'plugin2', type: 'Che Editor', name: 'Editor 1' }]);
  });

  it('should select plugins error', () => {
    const result = selectPluginsError(mockState);
    expect(result).toEqual('Something went wrong');
  });
});
