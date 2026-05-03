import { api } from '@eclipse-che/common';
import React from 'react';
export type Props = {
    providers: api.AiToolDefinition[];
    fixedProvider?: api.AiToolDefinition;
    onChange: (providerId: string, apiKey: string, isValid: boolean) => void;
};
export type State = {
    selectedProviderId: string;
    apiKey: string;
    isProviderSelectOpen: boolean;
};
export declare class AiProviderKeysAddEditForm extends React.PureComponent<Props, State> {
    constructor(props: Props);
    private get isValid();
    private handleProviderSelect;
    private handleApiKeyChange;
    render(): React.ReactElement;
}
//# sourceMappingURL=index.d.ts.map