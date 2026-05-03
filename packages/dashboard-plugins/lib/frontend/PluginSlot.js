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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getPluginLoaderTabs = exports.getPluginNavigationItems = exports.getPluginColumns = exports.getPluginTabs = exports.PluginSlot = void 0;
const react_1 = __importDefault(require("react"));
const registry_1 = require("../registry");
const PluginSlot = ({ name, props = {} }) => {
    const plugins = (0, registry_1.getRegisteredFrontendPlugins)();
    return (react_1.default.createElement(react_1.default.Fragment, null, plugins.map(plugin => {
        const slotValue = plugin.slots[name];
        if (!slotValue) {
            return null;
        }
        if (name === 'workspaceCreation' || name === 'workspaceDetailsOverview') {
            const SlotComponent = slotValue;
            return react_1.default.createElement(SlotComponent, { key: plugin.manifest.id, ...props });
        }
        return null;
    })));
};
exports.PluginSlot = PluginSlot;
function getPluginTabs() {
    const plugins = (0, registry_1.getRegisteredFrontendPlugins)();
    const tabs = [];
    for (const plugin of plugins) {
        const tab = plugin.slots.userPreferencesTab;
        if (tab) {
            tabs.push({
                pluginId: plugin.manifest.id,
                name: tab.name,
                tabKey: tab.key,
                component: tab.component,
                visible: tab.visible,
            });
        }
    }
    return tabs;
}
exports.getPluginTabs = getPluginTabs;
function getPluginColumns() {
    const plugins = (0, registry_1.getRegisteredFrontendPlugins)();
    const columns = [];
    for (const plugin of plugins) {
        const col = plugin.slots
            .workspacesListColumn;
        if (col) {
            columns.push({
                pluginId: plugin.manifest.id,
                name: col.name,
                component: col.component,
                visible: col.visible,
            });
        }
    }
    return columns;
}
exports.getPluginColumns = getPluginColumns;
function getPluginNavigationItems() {
    const plugins = (0, registry_1.getRegisteredFrontendPlugins)();
    const items = [];
    for (const plugin of plugins) {
        if (plugin.slots.navigationItems) {
            items.push(...plugin.slots.navigationItems);
        }
    }
    return items;
}
exports.getPluginNavigationItems = getPluginNavigationItems;
function getPluginLoaderTabs() {
    const plugins = (0, registry_1.getRegisteredFrontendPlugins)();
    const tabs = [];
    for (const plugin of plugins) {
        if (plugin.slots.loaderTabs) {
            tabs.push(...plugin.slots.loaderTabs);
        }
    }
    return tabs;
}
exports.getPluginLoaderTabs = getPluginLoaderTabs;
//# sourceMappingURL=PluginSlot.js.map