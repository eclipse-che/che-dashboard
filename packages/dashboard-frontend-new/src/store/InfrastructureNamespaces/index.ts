/* c8 ignore start */

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

export { actionCreators as infrastructureNamespacesActionCreators } from '@/store/InfrastructureNamespaces/actions';
export {
  reducer as infrastructureNamespacesReducer,
  State as InfrastructureNamespacesState,
} from '@/store/InfrastructureNamespaces/reducer';
export * from '@/store/InfrastructureNamespaces/selectors';
