import { api } from '@eclipse-che/common';
import React from 'react';
export type Props = {
    isOpen: boolean;
    availableProviders: api.AiToolDefinition[];
    fixedProvider?: api.AiToolDefinition;
    onSave: (providerId: string, apiKey: string) => void;
    onCloseModal: () => void;
};
export type State = {
    providerId: string;
    apiKey: string;
    isSaveEnabled: boolean;
};
export declare class AiProviderKeysAddEditModal extends React.PureComponent<Props, State> {
    constructor(props: Props);
    componentDidUpdate(prevProps: Props): void;
    private handleSave;
    private handleFormChange;
    render(): React.ReactElement;
}
//# sourceMappingURL=index.d.ts.map