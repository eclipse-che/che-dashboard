/* c8 ignore start */

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
import { selectRunningDevWorkspacesClusterLimitExceeded } from '@/store/DevWorkspacesCluster/selectors';

export { actionCreators as devWorkspacesClusterActionCreators } from '@/store/DevWorkspacesCluster/actions';
export {
  State as DevWorkspaceClusterState,
  reducer as devWorkspacesClusterReducer,
} from '@/store/DevWorkspacesCluster/reducer';
export * from '@/store/DevWorkspacesCluster/selectors';

/* c8 ignore stop */

export class RunningDevWorkspacesClusterLimitExceededError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'RunningDevWorkspacesClusterLimitExceededError';
  }
}

export function checkRunningDevWorkspacesClusterLimitExceeded(state: RootState) {
  const runningLimitExceeded = selectRunningDevWorkspacesClusterLimitExceeded(state);
  if (runningLimitExceeded === false) {
    return;
  }

  throwRunningDevWorkspacesClusterLimitExceededError();
}

export function throwRunningDevWorkspacesClusterLimitExceededError() {
  throw new RunningDevWorkspacesClusterLimitExceededError(
    'Exceeded the cluster limit for running DevWorkspaces',
  );
}
