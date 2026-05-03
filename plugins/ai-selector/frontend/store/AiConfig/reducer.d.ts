import { api } from '@eclipse-che/common';
export type AiConfigState = {
    providers: api.AiProviderDefinition[];
    tools: api.AiToolDefinition[];
    defaultAiProviders: string[];
    providerKeyExists: Record<string, boolean>;
    isLoading: boolean;
    error: string | undefined;
};
export declare const unloadedState: AiConfigState;
export declare const reducer: import("redux").Reducer<AiConfigState> & {
    getInitialState: () => AiConfigState;
};
//# sourceMappingURL=reducer.d.ts.map