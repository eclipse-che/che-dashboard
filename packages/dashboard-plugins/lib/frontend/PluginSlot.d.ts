import React from 'react';
import { LoaderTabDefinition, NavigationItemDefinition, PluginSlotProps } from '../types';
export declare const PluginSlot: React.FC<PluginSlotProps>;
export declare function getPluginTabs(): Array<{
    pluginId: string;
    name: string;
    tabKey: string;
    component: React.ComponentType;
    visible?: (state: unknown) => boolean;
}>;
export declare function getPluginColumns(): Array<{
    pluginId: string;
    name: string;
    component: React.ComponentType<{
        workspace: unknown;
    }>;
    visible?: (state: unknown) => boolean;
}>;
export declare function getPluginNavigationItems(): NavigationItemDefinition[];
export declare function getPluginLoaderTabs(): LoaderTabDefinition[];
//# sourceMappingURL=PluginSlot.d.ts.map