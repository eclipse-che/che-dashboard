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
  selectPreferences,
  selectPreferencesError,
  selectPreferencesSkipAuthorization,
  selectPreferencesTrustedSources,
} from '@/store/Workspaces/Preferences/selectors';

describe('Preferences, selectors', () => {
  const mockState = {
    workspacePreferences: {
      isLoading: false,
      error: 'Test error',
      preferences: {
        'skip-authorisation': ['azure-devops', 'bitbucket-server'],
        'trusted-sources': ['https://trusted-source.com'],
      },
    },
  } as Partial<RootState> as RootState;

  it('should select preferences', () => {
    const result = selectPreferences(mockState);
    expect(result).toEqual(mockState.workspacePreferences.preferences);
  });

  it('should select preferences error', () => {
    const result = selectPreferencesError(mockState);
    expect(result).toEqual('Test error');
  });

  it('should select preferences skip authorization', () => {
    const result = selectPreferencesSkipAuthorization(mockState);
    expect(result).toEqual(['azure-devops', 'bitbucket-server']);
  });

  it('should select preferences trusted sources', () => {
    const result = selectPreferencesTrustedSources(mockState);
    expect(result).toEqual(['https://trusted-source.com']);
  });
});
