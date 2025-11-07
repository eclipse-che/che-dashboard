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

/* c8 ignore start */

export { actionCreators as devWorkspacesActionCreators } from '@/store/Workspaces/devWorkspaces/actions';
export {
  reducer as devWorkspacesReducer,
  State as DevWorkspacesState,
} from '@/store/Workspaces/devWorkspaces/reducer';
export * from '@/store/Workspaces/devWorkspaces/selectors';

/* c8 ignore stop */

export class RunningWorkspacesExceededError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'RunningWorkspacesExceededError';
  }
}

export function throwRunningWorkspacesExceededError(runningLimit: number): never {
  const message = `You can only have ${runningLimit} running workspace${
    runningLimit > 1 ? 's' : ''
  } at a time.`;
  throw new RunningWorkspacesExceededError(message);
}
