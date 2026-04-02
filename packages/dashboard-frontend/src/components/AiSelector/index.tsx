/*
 * Copyright (c) 2018-2025 Red Hat, Inc.
 * This program and the accompanying materials are made
 * available under the terms of the Eclipse Public License 2.0
 * which is available at https://www.eclipse.org/legal/epl-2.0/
 *
 * SPDX-License-Identifier: EPL-2.0
 *
 * Contributors:
 *   Red Hat, Inc. - initial API and implementation
 */

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionToggle,
  Button,
  Content,
  Panel,
  PanelHeader,
  PanelMain,
  PanelMainBody,
  Title,
} from '@patternfly/react-core';
import React from 'react';
import { connect, ConnectedProps } from 'react-redux';

import { AiSelectorDocsLink } from '@/components/AiSelector/DocsLink';
import { AiProviderGallery } from '@/components/AiSelector/Gallery';
import { ROUTE } from '@/Routes';
import { UserPreferencesTab } from '@/services/helpers/types';
import { RootState } from '@/store';
import {
  aiConfigActionCreators,
  selectAiProviderKeyExists,
  selectAiProviders,
  selectAiTools,
  selectDefaultAiProvider,
} from '@/store/AiConfig';

type AccordionId = 'none' | 'selector';

export type Props = MappedProps & {
  onSelect: (providerId: string | undefined) => void;
};

export type State = {
  selectedProviderId: string | undefined;
  expandedId: AccordionId | undefined;
};

class AiSelector extends React.PureComponent<Props, State> {
  constructor(props: Props) {
    super(props);

    this.state = {
      selectedProviderId: undefined,
      expandedId: 'none',
    };
  }

  public componentDidMount(): void {
    this.props.requestAiConfig().catch(() => {
      // error is stored in Redux state via aiConfigErrorAction
    });

    this.preselectDefaultTool();

    // If tools are already loaded (from bootstrap), notify parent of the default tool
    const defaultToolId = this.findDefaultToolId();
    if (defaultToolId) {
      this.props.onSelect(defaultToolId);
    }
  }

  public componentDidUpdate(prevProps: Props): void {
    if (
      prevProps.aiTools !== this.props.aiTools ||
      prevProps.defaultProviderId !== this.props.defaultProviderId
    ) {
      this.preselectDefaultTool();

      // When "Use a Default AI Provider" is active, notify parent of the default tool
      if (this.state.expandedId === 'none') {
        const defaultToolId = this.findDefaultToolId();
        this.props.onSelect(defaultToolId);
      }
    }
  }

  private findDefaultToolId(): string | undefined {
    const { aiTools, defaultProviderId } = this.props;
    if (aiTools.length === 0) {
      return undefined;
    }
    if (defaultProviderId) {
      const match = aiTools.find(t => t.providerId === defaultProviderId);
      if (match) {
        return match.id;
      }
    }
    return [...aiTools].sort((a, b) => a.name.localeCompare(b.name))[0].id;
  }

  private preselectDefaultTool(): void {
    if (this.state.selectedProviderId !== undefined) {
      return;
    }
    const toolId = this.findDefaultToolId();
    if (toolId) {
      this.setState({ selectedProviderId: toolId });
    }
  }

  private handleToggle(expandedId: AccordionId): void {
    const { onSelect } = this.props;

    if (this.state.expandedId === expandedId) {
      return;
    }

    this.setState({ expandedId });

    if (expandedId === 'none') {
      // "Use a Default AI Provider" — inject the default tool
      const defaultToolId = this.findDefaultToolId();
      onSelect(defaultToolId);
    } else {
      onSelect(this.state.selectedProviderId);
    }
  }

  private handleProviderSelect(providerId: string): void {
    this.setState({ selectedProviderId: providerId });

    if (this.state.expandedId === 'selector') {
      this.props.onSelect(providerId);
    }
  }

  public render(): React.ReactElement | null {
    const { aiProviders, aiTools, defaultProviderId, providerKeyExists } = this.props;
    const { expandedId, selectedProviderId } = this.state;

    if (aiTools.length === 0) {
      return null;
    }

    const manageKeysHref = `${window.location.origin}/dashboard/#${ROUTE.USER_PREFERENCES}?tab=${UserPreferencesTab.AI_PROVIDER_KEYS}`;

    return (
      <Panel>
        <PanelHeader>
          <Title headingLevel="h3">AI Provider Selector</Title>
        </PanelHeader>
        <PanelMain>
          <PanelMainBody>
            <Accordion>
              <AccordionItem isExpanded={expandedId === 'none'}>
                <AccordionToggle
                  onClick={() => {
                    this.handleToggle('none');
                  }}
                  id="accordion-item-no-ai"
                >
                  Use a Default AI Provider
                </AccordionToggle>

                <AccordionContent data-testid="no-ai-provider-content">
                  <Panel>
                    <PanelMain>
                      <PanelMainBody>
                        <Content component="p">
                          {(() => {
                            const providerName = defaultProviderId
                              ? aiProviders.find(p => p.id === defaultProviderId)?.name
                              : undefined;
                            return providerName
                              ? `The default AI provider "${providerName}" configured by your administrator will be used.`
                              : 'The default AI provider configured by your administrator will be used.';
                          })()}
                        </Content>
                        <AiSelectorDocsLink />
                      </PanelMainBody>
                    </PanelMain>
                  </Panel>
                </AccordionContent>
              </AccordionItem>

              <AccordionItem isExpanded={expandedId === 'selector'}>
                <AccordionToggle
                  onClick={() => {
                    this.handleToggle('selector');
                  }}
                  id="accordion-item-ai-selector"
                >
                  Choose an AI Provider
                </AccordionToggle>

                <AccordionContent data-testid="ai-provider-gallery-content">
                  <Panel>
                    <PanelMain>
                      <PanelMainBody>
                        <AiProviderGallery
                          providers={aiTools}
                          selectedProviderId={selectedProviderId}
                          providerKeyExists={providerKeyExists}
                          onSelect={providerId => this.handleProviderSelect(providerId)}
                        />
                        <Content component="p" style={{ marginTop: '8px' }}>
                          <Button variant="link" isInline component="a" href={manageKeysHref}>
                            Manage API keys in User Preferences
                          </Button>
                        </Content>
                      </PanelMainBody>
                    </PanelMain>
                  </Panel>
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          </PanelMainBody>
        </PanelMain>
      </Panel>
    );
  }
}

const mapStateToProps = (state: RootState) => ({
  aiProviders: selectAiProviders(state),
  aiTools: selectAiTools(state),
  defaultProviderId: selectDefaultAiProvider(state),
  providerKeyExists: selectAiProviderKeyExists(state),
});

const mapDispatchToProps = {
  requestAiConfig: aiConfigActionCreators.requestAiConfig,
};

const connector = connect(mapStateToProps, mapDispatchToProps, null, {
  // forwardRef is mandatory for using `@react-mock/state` in unit tests
  forwardRef: true,
});

type MappedProps = ConnectedProps<typeof connector>;
export default connector(AiSelector);
