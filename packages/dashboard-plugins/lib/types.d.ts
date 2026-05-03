import { FastifyInstance } from 'fastify';
import { ComponentType, ReactNode } from 'react';
import { Reducer, Store } from 'redux';
export interface PluginManifest {
    id: string;
    name: string;
    version: string;
    description: string;
    enabled: boolean;
}
export interface BackendPlugin {
    manifest: PluginManifest;
    registerRoutes: (server: FastifyInstance) => Promise<void>;
}
export interface FrontendPlugin {
    manifest: PluginManifest;
    reducerKey: string;
    reducer: Reducer;
    bootstrap?: (store: Store) => Promise<void>;
    slots: PluginSlots;
    workspaceHooks?: WorkspaceHooks;
}
export interface TabDefinition {
    name: string;
    key: string;
    component: ComponentType;
    visible?: (state: unknown) => boolean;
}
export interface ColumnDefinition {
    name: string;
    component: ComponentType<any>;
    visible?: (state: unknown) => boolean;
}
export interface FactoryParamExtension {
    paramName: string;
    parse: (value: string) => string[];
}
export interface NavigationItemDefinition {
    to: string;
    label: string;
    labelSelector?: (state: unknown) => string;
    insertAfter?: string;
}
export interface LoaderTabDefinition {
    key: string;
    title: string;
    component: ComponentType<{
        workspace: unknown;
        isActive: boolean;
    }>;
    insertAfter?: string;
}
export interface PluginSlots {
    workspaceCreation?: ComponentType<any>;
    workspaceDetailsOverview?: ComponentType<any>;
    workspacesListColumn?: ColumnDefinition;
    userPreferencesTab?: TabDefinition;
    factoryParams?: FactoryParamExtension;
    navigationItems?: NavigationItemDefinition[];
    loaderTabs?: LoaderTabDefinition[];
}
export interface WorkspaceHooks {
    onWorkspaceCreate?: (workspace: Record<string, unknown>, factoryParams: Record<string, unknown>) => Record<string, unknown>;
    onWorkspaceStart?: (workspace: Record<string, unknown>) => Record<string, unknown> | null;
}
export interface PluginSlotProps {
    name: keyof PluginSlots;
    props?: Record<string, unknown>;
    children?: ReactNode;
}
//# sourceMappingURL=types.d.ts.map