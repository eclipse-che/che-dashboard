import { api } from '@eclipse-che/common';
import React from 'react';
export type Props = {
    isDisabled: boolean;
    providers: api.AiToolDefinition[];
    aiProviders: api.AiProviderDefinition[];
    providerKeyExists: Record<string, boolean>;
    canAddMore: boolean;
    onAddKey: () => void;
    onUpdateKey: (provider: api.AiToolDefinition) => void;
    onDeleteKey: (providers: api.AiToolDefinition[]) => void;
};
type State = {
    selectedItems: api.AiToolDefinition[];
};
export declare class AiProviderKeysList extends React.PureComponent<Props, State> {
    constructor(props: Props);
    private handleSelectItem;
    private deselectItems;
    private handleDeleteSelected;
    private buildActionItems;
    private getProviderIcon;
    render(): React.ReactElement;
}
export {};
//# sourceMappingURL=index.d.ts.map