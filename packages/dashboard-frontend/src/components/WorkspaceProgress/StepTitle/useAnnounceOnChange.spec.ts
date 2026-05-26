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

import { renderHook } from '@testing-library/react';

import { enqueueAnnouncement } from '@/components/WorkspaceProgress/StepTitle/announceQueue';
import { useAnnounceOnChange } from '@/components/WorkspaceProgress/StepTitle/useAnnounceOnChange';

jest.mock('@/components/WorkspaceProgress/StepTitle/announceQueue', () => ({
  enqueueAnnouncement: jest.fn(),
}));

describe('useAnnounceOnChange', () => {
  beforeEach(() => jest.clearAllMocks());

  it('does not announce on initial render', () => {
    renderHook(() => useAnnounceOnChange('Running', v => `Status: ${v}`));
    expect(enqueueAnnouncement).not.toHaveBeenCalled();
  });

  it('announces when value changes', () => {
    const { rerender } = renderHook(
      ({ v }: { v: string }) => useAnnounceOnChange(v, val => `Status: ${val}`),
      { initialProps: { v: 'Running' } },
    );
    rerender({ v: 'Stopped' });
    expect(enqueueAnnouncement).toHaveBeenCalledTimes(1);
    expect(enqueueAnnouncement).toHaveBeenCalledWith('Status: Stopped');
  });

  it('does not announce when value is unchanged', () => {
    const { rerender } = renderHook(
      ({ v }: { v: string }) => useAnnounceOnChange(v, val => `Status: ${val}`),
      { initialProps: { v: 'Running' } },
    );
    rerender({ v: 'Running' });
    expect(enqueueAnnouncement).not.toHaveBeenCalled();
  });
});
