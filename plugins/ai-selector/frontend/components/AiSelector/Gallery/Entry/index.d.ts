import { api } from '@eclipse-che/common';
import React from 'react';
export type Props = {
    provider: api.AiToolDefinition;
    icon?: string;
    description?: string;
    isSelected: boolean;
    hasExistingKey: boolean;
    onToggle: (providerId: string) => void;
};
export declare class AiProviderEntry extends React.PureComponent<Props> {
    private get cardId();
    private get selectableActionId();
    private handleToggle;
    private handleKeyDown;
    render(): React.ReactElement;
}
//# sourceMappingURL=index.d.ts.map