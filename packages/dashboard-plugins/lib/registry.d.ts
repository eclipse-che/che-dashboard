import { Reducer, Store } from 'redux';
import { BackendPlugin, FrontendPlugin } from './types';
export declare function registerBackendPlugin(plugin: BackendPlugin): void;
export declare function registerFrontendPlugin(plugin: FrontendPlugin): void;
export declare function getRegisteredBackendPlugins(): BackendPlugin[];
export declare function getRegisteredFrontendPlugins(): FrontendPlugin[];
export declare function getPluginReducers(): Record<string, Reducer>;
export declare function bootstrapPlugins(store: Store): Promise<void>;
export declare function runPluginCreateHooks(workspace: Record<string, unknown>, factoryParams: Record<string, unknown>): Record<string, unknown>;
export declare function runPluginStartHooks(workspace: Record<string, unknown>): Record<string, unknown> | null;
export declare function getPluginFactoryParams(): Array<{
    paramName: string;
    parse: (value: string) => string[];
}>;
//# sourceMappingURL=registry.d.ts.map