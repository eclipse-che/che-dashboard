import { api } from '@eclipse-che/common';
import React from 'react';
export type Props = {
    isOpen: boolean;
    providers: api.AiToolDefinition[];
    onCloseModal: () => void;
    onDelete: (providers: api.AiToolDefinition[]) => void;
};
export type State = {
    isChecked: boolean;
};
export declare class AiProviderKeysDeleteModal extends React.PureComponent<Props, State> {
    constructor(props: Props);
    private handleDelete;
    private handleCloseModal;
    render(): React.ReactElement;
}
//# sourceMappingURL=index.d.ts.map