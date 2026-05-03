import React from 'react';
import { ConnectedProps } from 'react-redux';
type AccordionId = 'none' | 'selector';
export type Props = MappedProps & {
    onSelect: (providerIds: string[]) => void;
};
export type State = {
    selectedProviderIds: string[];
    expandedId: AccordionId | undefined;
};
declare class AiSelector extends React.PureComponent<Props, State> {
    constructor(props: Props);
    componentDidMount(): void;
    componentDidUpdate(prevProps: Props): void;
    private findDefaultToolIds;
    private preselectDefaultTools;
    private handleToggle;
    private handleProviderToggle;
    private buildDefaultProviderMessage;
    render(): React.ReactElement | null;
}
declare const connector: import("react-redux").InferableComponentEnhancerWithProps<{
    aiProviders: import("@eclipse-che/common/lib/dto/api").AiProviderDefinition[];
    aiTools: import("@eclipse-che/common/lib/dto/api").AiToolDefinition[];
    defaultProviderIds: string[];
    providerKeyExists: Record<string, boolean>;
} & {}, {}>;
type MappedProps = ConnectedProps<typeof connector>;
declare const _default: import("react-redux").ConnectedComponent<typeof AiSelector, {
    ref?: React.LegacyRef<AiSelector> | undefined;
    onSelect: (providerIds: string[]) => void;
    key?: React.Key | null | undefined;
    context?: React.Context<import("react-redux").ReactReduxContextValue<any, import("redux").UnknownAction> | null> | undefined;
    store?: import("redux").Store | undefined;
}>;
export default _default;
//# sourceMappingURL=index.d.ts.map