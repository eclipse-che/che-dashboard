import { api } from '@eclipse-che/common';
import React from 'react';
import { ConnectedProps } from 'react-redux';
export type Props = MappedProps;
export type State = {
    isAddEditOpen: boolean;
    isDeleteOpen: boolean;
    editingProvider: api.AiToolDefinition | undefined;
    deletingProviders: api.AiToolDefinition[];
};
declare class AiProviderKeys extends React.PureComponent<Props, State> {
    private readonly appAlerts;
    constructor(props: Props);
    componentDidMount(): Promise<void>;
    componentDidUpdate(prevProps: Props): void;
    private handleShowAddModal;
    private handleShowUpdateModal;
    private handleCloseAddEditModal;
    private handleShowDeleteModal;
    private handleCloseDeleteModal;
    private handleSave;
    private handleDelete;
    render(): React.ReactElement;
}
declare const connector: import("react-redux").InferableComponentEnhancerWithProps<{
    aiProviders: api.AiProviderDefinition[];
    tools: api.AiToolDefinition[];
    providerKeyExists: Record<string, boolean>;
    isLoading: boolean;
    error: string | undefined;
} & {
    requestAiProviderKeyStatus: () => Promise<void>;
    saveAiProviderKey: (toolId: string, apiKey: string) => Promise<void>;
    deleteAiProviderKey: (toolId: string) => Promise<void>;
}, {}>;
type MappedProps = ConnectedProps<typeof connector>;
declare const _default: import("react-redux").ConnectedComponent<typeof AiProviderKeys, {
    ref?: React.LegacyRef<AiProviderKeys> | undefined;
    key?: React.Key | null | undefined;
    context?: React.Context<import("react-redux").ReactReduxContextValue<any, import("redux").UnknownAction> | null> | undefined;
    store?: import("redux").Store | undefined;
}>;
export default _default;
//# sourceMappingURL=index.d.ts.map