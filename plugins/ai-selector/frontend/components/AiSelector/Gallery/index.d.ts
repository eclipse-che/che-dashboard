import { api } from '@eclipse-che/common';
import React from 'react';
export type Props = {
    providers: api.AiToolDefinition[];
    aiProviders: api.AiProviderDefinition[];
    selectedProviderIds: string[];
    providerKeyExists: Record<string, boolean>;
    onToggle: (providerId: string) => void;
};
export declare class AiProviderGallery extends React.PureComponent<Props> {
    private getProvider;
    render(): React.ReactElement;
}
//# sourceMappingURL=index.d.ts.map