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

import { ThunkDispatch, UnknownAction } from '@reduxjs/toolkit';

import { RootState } from '@/store';
import { verifyAuthorized } from '@/store/SanityCheck';

const mockTestBackends = jest.fn();
jest.mock('@/store/SanityCheck/actions', () => {
  const originalModule = jest.requireActual('@/store/SanityCheck/actions');

  return {
    ...originalModule,
    actionCreators: {
      testBackends: () => mockTestBackends(),
    },
  };
});

describe('SanityCheck, verifyAuthorized', () => {
  let dispatch: ThunkDispatch<RootState, unknown, UnknownAction>;
  let getState: () => RootState;

  beforeEach(() => {
    dispatch = jest.fn();
    getState = jest.fn();

    jest.clearAllMocks();
  });

  it('should dispatch testBackends and resolve if authorized', async () => {
    const mockState = {
      sanityCheck: {
        authorized: true,
        error: undefined,
      },
    } as RootState;

    (getState as jest.Mock).mockReturnValue(mockState);

    await verifyAuthorized(dispatch, getState);

    expect(dispatch).toHaveBeenCalledWith(mockTestBackends());
  });

  it('should dispatch testBackends and throw error if not authorized', async () => {
    const errorMessage = 'Not authorized';
    const mockState = {
      sanityCheck: {
        authorized: false,
        error: errorMessage,
      },
    } as RootState;

    (getState as jest.Mock).mockReturnValue(mockState);

    await expect(verifyAuthorized(dispatch, getState)).rejects.toThrow(errorMessage);

    expect(dispatch).toHaveBeenCalledWith(mockTestBackends());
  });

  it('should dispatch testBackends and throw error if not authorized and error is undefined', async () => {
    const mockState = {
      sanityCheck: {
        authorized: false,
        error: undefined,
      },
    } as RootState;

    (getState as jest.Mock).mockReturnValue(mockState);

    await expect(verifyAuthorized(dispatch, getState)).rejects.toThrow('');

    expect(dispatch).toHaveBeenCalledWith(mockTestBackends());
  });
});
