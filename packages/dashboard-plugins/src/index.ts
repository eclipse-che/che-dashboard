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

export type {
  BackendPlugin,
  ColumnDefinition,
  FactoryParamExtension,
  FrontendPlugin,
  LoaderTabDefinition,
  NavigationItemDefinition,
  PluginManifest,
  PluginSlotProps,
  PluginSlots,
  TabDefinition,
  WorkspaceHooks,
} from './types';

export {
  bootstrapPlugins,
  getPluginFactoryParams,
  getPluginReducers,
  getRegisteredBackendPlugins,
  getRegisteredFrontendPlugins,
  registerBackendPlugin,
  registerFrontendPlugin,
  runPluginCreateHooks,
  runPluginStartHooks,
} from './registry';

export { getPluginColumns, getPluginLoaderTabs, getPluginNavigationItems, getPluginTabs, PluginSlot } from './frontend/PluginSlot';
