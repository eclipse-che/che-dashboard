import React from 'react';
import { ConnectedProps } from 'react-redux';
import { Workspace } from '@/services/workspace-adapter';
export type Props = MappedProps & {
    readonly: boolean;
    workspace: Workspace;
    onSave: (workspace: Workspace) => Promise<void>;
};
export type State = {
    isSelectorOpen: boolean;
    isInfoOpen: boolean;
    selected: string[];
};
declare class AiToolFormGroup extends React.PureComponent<Props, State> {
    constructor(props: Props);
    componentDidUpdate(prevProps: Props): void;
    private getDisplayName;
    private handleCancelChanges;
    private handleConfirmChanges;
    render(): React.ReactNode;
}
declare const connector: import("react-redux").InferableComponentEnhancerWithProps<{
    aiProviders: import("@eclipse-che/common/lib/dto/api").AiProviderDefinition[];
    aiTools: import("@eclipse-che/common/lib/dto/api").AiToolDefinition[];
} & import("react-redux").DispatchProp<import("redux").UnknownAction>, {}>;
type MappedProps = ConnectedProps<typeof connector>;
export { AiToolFormGroup };
declare const _default: import("react-redux").ConnectedComponent<typeof AiToolFormGroup, {
    ref?: React.LegacyRef<AiToolFormGroup> | undefined;
    key?: React.Key | null | undefined;
    workspace: Workspace;
    readonly: boolean;
    onSave: (workspace: Workspace) => Promise<void>;
    context?: React.Context<import("react-redux").ReactReduxContextValue<any, import("redux").UnknownAction> | null> | undefined;
    store?: import("redux").Store | undefined;
}>;
export default _default;
//# sourceMappingURL=index.d.ts.map