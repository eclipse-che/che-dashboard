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
  selectGitConfig,
  selectGitConfigError,
  selectGitConfigIsLoading,
} from '@/store/GitConfig/selectors';

describe('GitConfig Selectors', () => {
  const mockState = {
    gitConfig: {
      isLoading: true,
      config: { gitconfig: 'mockConfig' },
      error: 'Something went wrong',
    },
  } as unknown as RootState;

  it('should select isLoading', () => {
    const result = selectGitConfigIsLoading(mockState);
    expect(result).toBe(true);
  });

  it('should select gitConfig', () => {
    const result = selectGitConfig(mockState);
    expect(result).toEqual('mockConfig');
  });

  it('should select error', () => {
    const result = selectGitConfigError(mockState);
    expect(result).toEqual('Something went wrong');
  });
});
