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
  selectAiProviderKeyExists,
  selectAiProviders,
  selectAiTools,
  selectDefaultAiProviders,
} from '@/store/AiConfig';

type AccordionId = 'none' | 'selector';

export type Props = MappedProps & {
  onSelect: (providerIds: string[]) => void;
};

export type State = {
  selectedProviderIds: string[];
  expandedId: AccordionId | undefined;
};

class AiSelector extends React.PureComponent<Props, State> {
  constructor(props: Props) {
    super(props);

    this.state = {
      selectedProviderIds: [],
      expandedId: 'none',
    };
  }

  public componentDidMount(): void {
    this.preselectDefaultTools();

    // If tools are already loaded (from bootstrap), notify parent of defaults
    const defaultToolIds = this.findDefaultToolIds();
    if (defaultToolIds.length > 0) {
      this.props.onSelect(defaultToolIds);
    }
  }

  public componentDidUpdate(prevProps: Props): void {
    if (
      prevProps.aiTools !== this.props.aiTools ||
      prevProps.defaultProviderIds !== this.props.defaultProviderIds
    ) {
      this.preselectDefaultTools();

      // When "Use Default AI Providers" is active, notify parent
      if (this.state.expandedId === 'none') {
        const defaultToolIds = this.findDefaultToolIds();
        this.props.onSelect(defaultToolIds);
      }
    }
  }

  private findDefaultToolIds(): string[] {
    const { aiTools, defaultProviderIds } = this.props;
    if (aiTools.length === 0) {
      return [];
    }
    if (defaultProviderIds.length > 0) {
      return defaultProviderIds.filter(id => aiTools.some(t => t.providerId === id));
    }
    // Fallback: first tool alphabetically
    const first = [...aiTools].sort((a, b) => a.name.localeCompare(b.name))[0];
    return first ? [first.providerId] : [];
  }

  private preselectDefaultTools(): void {
    if (this.state.selectedProviderIds.length > 0) {
      return;
    }
    const toolIds = this.findDefaultToolIds();
    if (toolIds.length > 0) {
      this.setState({ selectedProviderIds: toolIds });
    }
  }

  private handleToggle(expandedId: AccordionId): void {
    const { onSelect } = this.props;

    if (this.state.expandedId === expandedId) {
      return;
    }

    this.setState({ expandedId });

    if (expandedId === 'none') {
      // "Use Default AI Providers" — reset selections to defaults
      const defaultToolIds = this.findDefaultToolIds();
      this.setState({ selectedProviderIds: defaultToolIds });
      onSelect(defaultToolIds);
    } else {
      onSelect(this.state.selectedProviderIds);
    }
  }

  private handleProviderToggle(providerId: string): void {
    this.setState(prevState => {
      const isSelected = prevState.selectedProviderIds.includes(providerId);
      const selectedProviderIds = isSelected
        ? prevState.selectedProviderIds.filter(id => id !== providerId)
        : [...prevState.selectedProviderIds, providerId];

      if (this.state.expandedId === 'selector') {
        this.props.onSelect(selectedProviderIds);
      }

      return { selectedProviderIds };
    });
  }

  private buildDefaultProviderMessage(): string {
    const { aiProviders, defaultProviderIds } = this.props;
    const names = defaultProviderIds
      .map(id => aiProviders.find(p => p.id === id)?.name)
      .filter((name): name is string => name !== undefined);

    if (names.length === 0) {
      return 'The default AI provider configured by your administrator will be used.';
    }
    if (names.length === 1) {
      return `The default AI provider "${names[0]}" configured by your administrator will be used.`;
    }
    const quoted = names.map(n => `"${n}"`).join(', ');
    return `The default AI providers ${quoted} configured by your administrator will be used.`;
  }

  public render(): React.ReactElement | null {
    const { aiProviders, aiTools, providerKeyExists } = this.props;
    const { expandedId, selectedProviderIds } = this.state;

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
                        <Content component="p">{this.buildDefaultProviderMessage()}</Content>
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
                          aiProviders={aiProviders}
                          selectedProviderIds={selectedProviderIds}
                          providerKeyExists={providerKeyExists}
                          onToggle={providerId => this.handleProviderToggle(providerId)}
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
  defaultProviderIds: selectDefaultAiProviders(state),
  providerKeyExists: selectAiProviderKeyExists(state),
});

const mapDispatchToProps = {};

const connector = connect(mapStateToProps, mapDispatchToProps, null, {
  // forwardRef is mandatory for using `@react-mock/state` in unit tests
  forwardRef: true,
});

type MappedProps = ConnectedProps<typeof connector>;
export default connector(AiSelector);
