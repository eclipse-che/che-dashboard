/*
 * Copyright (c) 2018-2021 Red Hat, Inc.
 * This program and the accompanying materials are made
 * available under the terms of the Eclipse Public License 2.0
 * which is available at https://www.eclipse.org/legal/epl-2.0/
 *
 * SPDX-License-Identifier: EPL-2.0
 *
 * Contributors:
 *   Red Hat, Inc. - initial API and implementation
 */

import { createSelector } from 'reselect';
import { AppState } from '..';
import { selectAllPods } from '../Pods/selectors';

const selectState = (state: AppState) => state.events;
const selectPods = (state: AppState) => selectAllPods(state);

export const selectAllEvents = createSelector(selectState, state => state.events);

export const selectEvents = createSelector(
  selectAllEvents,
  selectPods,
  (allEvents, allPods) => (devworkspaceId: string) => {
    const pod = allPods.find(pod => pod.metadata?.name?.startsWith(devworkspaceId));
    const podName = pod?.metadata?.name;
    if (podName === undefined) {
      return [];
    }
    return allEvents.filter(event => event.involvedObject.name?.startsWith(podName));
  },
);

export const selectEventsError = createSelector(selectState, state => state.error);

export const selectEventsIsLoading = createSelector(selectState, state => state.isLoading);

export const selectEventsResourceVersion = createSelector(
  selectState,
  state => state.resourceVersion,
);
