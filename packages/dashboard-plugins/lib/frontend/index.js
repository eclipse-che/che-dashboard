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
exports.runPluginStartHooks = exports.runPluginCreateHooks = exports.registerFrontendPlugin = exports.getPluginReducers = exports.getPluginFactoryParams = exports.bootstrapPlugins = exports.PluginSlot = exports.getPluginTabs = exports.getPluginColumns = void 0;
var PluginSlot_1 = require("./PluginSlot");
Object.defineProperty(exports, "getPluginColumns", { enumerable: true, get: function () { return PluginSlot_1.getPluginColumns; } });
Object.defineProperty(exports, "getPluginTabs", { enumerable: true, get: function () { return PluginSlot_1.getPluginTabs; } });
Object.defineProperty(exports, "PluginSlot", { enumerable: true, get: function () { return PluginSlot_1.PluginSlot; } });
var registry_1 = require("../registry");
Object.defineProperty(exports, "bootstrapPlugins", { enumerable: true, get: function () { return registry_1.bootstrapPlugins; } });
Object.defineProperty(exports, "getPluginFactoryParams", { enumerable: true, get: function () { return registry_1.getPluginFactoryParams; } });
Object.defineProperty(exports, "getPluginReducers", { enumerable: true, get: function () { return registry_1.getPluginReducers; } });
Object.defineProperty(exports, "registerFrontendPlugin", { enumerable: true, get: function () { return registry_1.registerFrontendPlugin; } });
Object.defineProperty(exports, "runPluginCreateHooks", { enumerable: true, get: function () { return registry_1.runPluginCreateHooks; } });
Object.defineProperty(exports, "runPluginStartHooks", { enumerable: true, get: function () { return registry_1.runPluginStartHooks; } });
//# sourceMappingURL=index.js.map