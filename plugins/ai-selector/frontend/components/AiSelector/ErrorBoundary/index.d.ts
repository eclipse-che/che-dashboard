import React, { ErrorInfo, PropsWithChildren } from 'react';
type State = {
    hasError: boolean;
    errorMessage: string | undefined;
};
export declare class AiSelectorErrorBoundary extends React.PureComponent<PropsWithChildren, State> {
    constructor(props: PropsWithChildren);
    static getDerivedStateFromError(error: Error): State;
    componentDidCatch(error: Error, errorInfo: ErrorInfo): void;
    render(): React.ReactNode;
}
export {};
//# sourceMappingURL=index.d.ts.map