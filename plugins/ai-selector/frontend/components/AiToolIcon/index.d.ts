import { api } from '@eclipse-che/common';
import React from 'react';
import { Workspace } from '@/services/workspace-adapter';
export type Props = {
    workspace: Workspace;
    aiTools: api.AiToolDefinition[];
    aiProviders: api.AiProviderDefinition[];
};
export declare function AiToolIcon(props: Props): React.ReactElement;
//# sourceMappingURL=index.d.ts.map