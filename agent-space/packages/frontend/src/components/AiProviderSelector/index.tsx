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
  Flex,
  FlexItem,
  Panel,
  PanelHeader,
  PanelMain,
  PanelMainBody,
  Title,
} from '@patternfly/react-core';
import React from 'react';

import { AiProviderGallery } from '@/components/AiProviderSelector/Gallery';
import { AiProviderDefinition, AiToolDefinition } from '@/services/catalog';
import { AiToolVersions, SandboxCustomization } from '@/services/sandboxFactory';

/** Where "Learn more about AI providers" goes, as in the dashboard. */
const DOCS_URL =
  'https://eclipse.dev/che/docs/stable/end-user-guide/using-ai-assistants-in-workspaces/';

type AccordionId = 'none' | 'selector';

export type Props = {
  aiTools: AiToolDefinition[];
  aiProviders: AiProviderDefinition[];
  /** Providers the administrator named in the registry, in their order. */
  defaultProviderIds: string[];
  manageKeysUrl: string;
  isDisabled?: boolean;
  onChange: (customization: SandboxCustomization) => void;
};

/**
 * The AI provider selector of the dashboard's create-workspace page, ported
 * for the Getting Started gallery: a panel with two accordion items, one for
 * the provider the administrator chose and one for picking from a card
 * gallery.
 *
 * It is deliberately a copy rather than a shared component. Agent Space is a
 * separate bundle and does not depend on the dashboard's sources; the wizard
 * and the sandbox details page keep the compact pencil selector, which suits a
 * form row and a read-only row respectively.
 *
 * Renders nothing when the cluster publishes no AI tools - an empty control
 * only raises the question of what is missing.
 */
export function AiProviderSelector({
  aiTools,
  aiProviders,
  defaultProviderIds,
  manageKeysUrl,
  isDisabled = false,
  onChange,
}: Props): React.ReactElement | null {
  const [expandedId, setExpandedId] = React.useState<AccordionId>('none');
  const [selected, setSelected] = React.useState<string[]>([]);
  const [versions, setVersions] = React.useState<AiToolVersions>({});

  const findDefaultProviderIds = React.useCallback((): string[] => {
    if (aiTools.length === 0) {
      return [];
    }
    if (defaultProviderIds.length > 0) {
      return defaultProviderIds.filter(id => aiTools.some(tool => tool.providerId === id));
    }
    // No default configured: the first provider by name, so the gallery is
    // never shown with nothing picked.
    const [first] = [...aiTools].sort((a, b) => a.name.localeCompare(b.name));
    return first === undefined ? [] : [first.providerId];
  }, [aiTools, defaultProviderIds]);

  // The catalogue is fetched after the page is on screen, so the defaults are
  // applied when it answers rather than only on mount. Reported upwards as
  // well: while the default item is the open one, the defaults are the choice.
  const expandedIdRef = React.useRef(expandedId);
  expandedIdRef.current = expandedId;
  const onChangeRef = React.useRef(onChange);
  onChangeRef.current = onChange;

  React.useEffect(() => {
    const defaults = findDefaultProviderIds();
    setSelected(current => (current.length > 0 ? current : defaults));
    if (expandedIdRef.current === 'none') {
      onChangeRef.current({ aiProviderIds: defaults, aiVersions: {} });
    }
  }, [findDefaultProviderIds]);

  const handleAccordionToggle = (id: AccordionId): void => {
    if (expandedId === id) {
      return;
    }
    setExpandedId(id);

    if (id === 'none') {
      const defaults = findDefaultProviderIds();
      setSelected(defaults);
      setVersions({});
      onChange({ aiProviderIds: defaults, aiVersions: {} });
    } else {
      onChange({ aiProviderIds: selected, aiVersions: versions });
    }
  };

  const handleProviderToggle = (providerId: string): void => {
    const next = selected.includes(providerId)
      ? selected.filter(id => id !== providerId)
      : [...selected, providerId];
    setSelected(next);
    if (expandedId === 'selector') {
      onChange({ aiProviderIds: next, aiVersions: versions });
    }
  };

  const handleVersionChange = (providerId: string, tag: string): void => {
    // Picking a version is how a user says they want the tool.
    const next = selected.includes(providerId) ? selected : [...selected, providerId];
    const nextVersions = { ...versions, [providerId]: tag };
    setSelected(next);
    setVersions(nextVersions);
    if (expandedId === 'selector') {
      onChange({ aiProviderIds: next, aiVersions: nextVersions });
    }
  };

  const defaultProviderMessage = React.useMemo(() => {
    const names = findDefaultProviderIds()
      .map(id => aiProviders.find(provider => provider.id === id)?.name)
      .filter((name): name is string => name !== undefined);

    if (names.length === 0) {
      return 'The default AI provider configured by your administrator will be used.';
    }
    if (names.length === 1) {
      return `The default AI provider "${names[0]}" configured by your administrator will be used.`;
    }
    const quoted = names.map(name => `"${name}"`).join(', ');
    return `The default AI providers ${quoted} configured by your administrator will be used.`;
  }, [aiProviders, findDefaultProviderIds]);

  if (aiTools.length === 0) {
    return null;
  }

  return (
    <Panel variant="bordered" style={{ marginBottom: 'var(--pf-t--global--spacer--md)' }}>
      <PanelHeader>
        <Title headingLevel="h3">AI Provider Selector</Title>
      </PanelHeader>
      <PanelMain>
        <PanelMainBody>
          <Accordion>
            <AccordionItem isExpanded={expandedId === 'none'}>
              <AccordionToggle
                onClick={() => handleAccordionToggle('none')}
                id="accordion-item-no-ai"
              >
                Use a Default AI Provider
              </AccordionToggle>

              <AccordionContent data-testid="no-ai-provider-content">
                <Panel>
                  <PanelMain>
                    <PanelMainBody>
                      <Content component="p" data-testid="default-ai-provider-message">
                        {defaultProviderMessage}
                      </Content>
                      <Flex>
                        <FlexItem align={{ default: 'alignRight' }}>
                          <Button
                            component="a"
                            href={DOCS_URL}
                            variant="link"
                            isInline
                            target="_blank"
                          >
                            Learn more about AI providers
                          </Button>
                        </FlexItem>
                      </Flex>
                    </PanelMainBody>
                  </PanelMain>
                </Panel>
              </AccordionContent>
            </AccordionItem>

            <AccordionItem isExpanded={expandedId === 'selector'}>
              <AccordionToggle
                onClick={() => handleAccordionToggle('selector')}
                id="accordion-item-ai-selector"
              >
                Choose an AI Provider
              </AccordionToggle>

              <AccordionContent data-testid="ai-provider-gallery-content">
                <Panel>
                  <PanelMain>
                    <PanelMainBody>
                      <AiProviderGallery
                        aiTools={aiTools}
                        aiProviders={aiProviders}
                        selectedProviderIds={selected}
                        versions={versions}
                        isDisabled={isDisabled}
                        onToggle={handleProviderToggle}
                        onVersionChange={handleVersionChange}
                      />
                      <Content component="p" style={{ marginTop: '8px' }}>
                        <Button
                          variant="link"
                          isInline
                          component="a"
                          href={manageKeysUrl}
                          target="_blank"
                          data-testid="manage-keys-link"
                        >
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
