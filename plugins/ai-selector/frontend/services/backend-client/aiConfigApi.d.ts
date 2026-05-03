import { api } from '@eclipse-che/common';
export declare function fetchAiRegistry(): Promise<api.IAiRegistry>;
export declare function fetchAiProviderKeyStatus(namespace: string): Promise<string[]>;
export declare function saveAiProviderKey(namespace: string, toolId: string, envVarName: string, apiKey: string): Promise<void>;
export declare function deleteAiProviderKey(namespace: string, toolId: string): Promise<void>;
//# sourceMappingURL=aiConfigApi.d.ts.map