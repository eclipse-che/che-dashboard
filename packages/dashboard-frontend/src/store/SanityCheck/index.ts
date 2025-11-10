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

import { ThunkDispatch, UnknownAction } from '@reduxjs/toolkit';

import { RootState } from '@/store';
import { actionCreators } from '@/store/SanityCheck/actions';

/* c8 ignore start */

export { actionCreators as sanityCheckActionCreators } from '@/store/SanityCheck/actions';
export {
  reducer as sanityCheckReducer,
  State as SanityCheckState,
} from '@/store/SanityCheck/reducer';
export * from '@/store/SanityCheck/selectors';

/* c8 ignore stop */

export async function verifyAuthorized(
  dispatch: ThunkDispatch<RootState, unknown, UnknownAction>,
  getState: () => RootState,
): Promise<void> {
  await dispatch(actionCreators.testBackends());
  const state = getState();
  const authorized = state.sanityCheck.authorized;
  if (authorized === false) {
    const error = state.sanityCheck.error || '';
    throw new Error(error);
  }
}
