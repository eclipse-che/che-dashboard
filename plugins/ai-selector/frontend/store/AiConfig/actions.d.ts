import { api } from '@eclipse-che/common';
import { AppThunk } from '@/store';
export declare const aiConfigRequestAction: import("@reduxjs/toolkit").ActionCreatorWithoutPayload<"aiConfig/request">;
export declare const aiConfigRegistryReceiveAction: import("@reduxjs/toolkit").ActionCreatorWithPayload<api.IAiRegistry, string>;
export declare const aiConfigKeyStatusReceiveAction: import("@reduxjs/toolkit").ActionCreatorWithPayload<Record<string, boolean>, string>;
export declare const aiConfigErrorAction: import("@reduxjs/toolkit").ActionCreatorWithPayload<string, string>;
export declare const actionCreators: {
    requestAiRegistry: () => AppThunk;
    requestAiProviderKeyStatus: () => AppThunk;
    saveAiProviderKey: (toolId: string, apiKey: string) => AppThunk;
    deleteAiProviderKey: (toolId: string) => AppThunk;
};
//# sourceMappingURL=actions.d.ts.map