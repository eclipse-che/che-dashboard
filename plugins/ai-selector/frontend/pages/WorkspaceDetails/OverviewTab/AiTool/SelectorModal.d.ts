import { api } from '@eclipse-che/common';
import React from 'react';
type Props = {
    isOpen: boolean;
    aiTools: api.AiToolDefinition[];
    aiProviders: api.AiProviderDefinition[];
    selected: string[];
    originSelection: string[];
    onToggle: (toolId: string) => void;
    onConfirm: () => void;
    onCancel: () => void;
};
export declare class AiToolSelectorModal extends React.PureComponent<Props> {
    render(): React.ReactNode;
}
export {};
//# sourceMappingURL=SelectorModal.d.ts.map