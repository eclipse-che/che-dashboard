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

import { BRANDING_DEFAULT } from '@/services/bootstrap/branding.constant';
import { RootState } from '@/store';
import { selectBranding, selectBrandingError } from '@/store/Branding/selectors';

describe('Branding Selectors', () => {
  const mockState = {
    branding: {
      data: BRANDING_DEFAULT,
      error: 'Error message',
    },
  } as RootState;

  it('should select branding data', () => {
    const result = selectBranding(mockState);
    expect(result).toEqual(BRANDING_DEFAULT);
  });

  it('should select branding error', () => {
    const result = selectBrandingError(mockState);
    expect(result).toBe('Error message');
  });

  it('should return empty string if branding error is not available', () => {
    const stateWithoutError = {
      ...mockState,
      branding: { error: undefined },
    } as RootState;
    const result = selectBrandingError(stateWithoutError);
    expect(result).toBeUndefined();
  });
});
