import { api } from '@eclipse-che/common';
import React from 'react';
type Props = {
    isOpen: boolean;
    aiTools: api.AiToolDefinition[];
    aiProviders: api.AiProviderDefinition[];
    onClose: () => void;
};
export declare class AiToolInfoModal extends React.PureComponent<Props> {
    render(): React.ReactNode;
}
export {};
//# sourceMappingURL=InfoModal.d.ts.map