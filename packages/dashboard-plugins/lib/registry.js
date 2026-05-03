"use strict";
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
Object.defineProperty(exports, "__esModule", { value: true });
exports.getPluginFactoryParams = exports.runPluginStartHooks = exports.runPluginCreateHooks = exports.bootstrapPlugins = exports.getPluginReducers = exports.getRegisteredFrontendPlugins = exports.getRegisteredBackendPlugins = exports.registerFrontendPlugin = exports.registerBackendPlugin = void 0;
const backendPlugins = [];
const frontendPlugins = [];
function registerBackendPlugin(plugin) {
    if (!plugin.manifest.enabled) {
        return;
    }
    backendPlugins.push(plugin);
}
exports.registerBackendPlugin = registerBackendPlugin;
function registerFrontendPlugin(plugin) {
    console.log(`[PluginSystem] Registering plugin: ${plugin.manifest.id} (enabled=${plugin.manifest.enabled})`);
    if (!plugin.manifest.enabled) {
        return;
    }
    frontendPlugins.push(plugin);
    console.log(`[PluginSystem] Total registered plugins: ${frontendPlugins.length}`);
}
exports.registerFrontendPlugin = registerFrontendPlugin;
function getRegisteredBackendPlugins() {
    return [...backendPlugins];
}
exports.getRegisteredBackendPlugins = getRegisteredBackendPlugins;
function getRegisteredFrontendPlugins() {
    console.log(`[PluginSystem] getRegisteredFrontendPlugins called, count=${frontendPlugins.length}`);
    return [...frontendPlugins];
}
exports.getRegisteredFrontendPlugins = getRegisteredFrontendPlugins;
function getPluginReducers() {
    const reducers = {};
    for (const plugin of frontendPlugins) {
        reducers[plugin.reducerKey] = plugin.reducer;
    }
    return reducers;
}
exports.getPluginReducers = getPluginReducers;
async function bootstrapPlugins(store) {
    const results = await Promise.allSettled(frontendPlugins
        .filter(p => p.bootstrap !== undefined)
        .map(p => p.bootstrap(store)));
    for (const result of results) {
        if (result.status === 'rejected') {
            console.warn('Plugin bootstrap failed:', result.reason);
        }
    }
}
exports.bootstrapPlugins = bootstrapPlugins;
function runPluginCreateHooks(workspace, factoryParams) {
    let result = workspace;
    for (const plugin of frontendPlugins) {
        if (plugin.workspaceHooks?.onWorkspaceCreate) {
            result = plugin.workspaceHooks.onWorkspaceCreate(result, factoryParams);
        }
    }
    return result;
}
exports.runPluginCreateHooks = runPluginCreateHooks;
function runPluginStartHooks(workspace) {
    let result = workspace;
    for (const plugin of frontendPlugins) {
        if (plugin.workspaceHooks?.onWorkspaceStart && result !== null) {
            result = plugin.workspaceHooks.onWorkspaceStart(result);
        }
    }
    return result;
}
exports.runPluginStartHooks = runPluginStartHooks;
function getPluginFactoryParams() {
    return frontendPlugins
        .filter(p => p.slots.factoryParams !== undefined)
        .map(p => p.slots.factoryParams);
}
exports.getPluginFactoryParams = getPluginFactoryParams;
//# sourceMappingURL=registry.js.map