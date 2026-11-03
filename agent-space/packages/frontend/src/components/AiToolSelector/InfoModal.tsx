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

import { Content, Modal, ModalBody, ModalHeader, ModalVariant } from '@patternfly/react-core';
import React from 'react';

import { AiProviderDefinition, AiToolDefinition, groupToolsByProvider } from '@/services/catalog';

export type Props = {
  isOpen: boolean;
  aiTools: AiToolDefinition[];
  aiProviders: AiProviderDefinition[];
  onClose: () => void;
};

/**
 * What the AI tools are and how they get into a sandbox.
 *
 * The same answer a workspace gives, under the same title, because a user who
 * has asked it once on the workspace page should not have to ask it again
 * here and get something different back.
 */
export function AiToolInfoModal({
  isOpen,
  aiTools,
  aiProviders,
  onClose,
}: Props): React.ReactElement {
  return (
    <Modal
      variant={ModalVariant.small}
      isOpen={isOpen}
      onClose={onClose}
      elementToFocus="[data-pf-initial-focus]"
      data-testid="ai-tool-info-modal"
    >
      <ModalHeader title="AI Tool Info" />
      <ModalBody>
        <div data-pf-initial-focus tabIndex={-1} style={{ outline: 'none' }}>
          {aiTools.length === 0 ? (
            <Content>
              <Content component="p">
                No AI tools are available. Ask your administrator to configure AI tools in the
                CheCluster custom resource.
              </Content>
            </Content>
          ) : (
            <Content>
              <Content component="p">
                AI coding tools are injected into sandbox containers at start via init containers.
                The selected tool binary is copied to a shared volume and added to <code>PATH</code>
                .
              </Content>
              {groupToolsByProvider(aiTools).map(toolGroup => {
                const def = toolGroup[0];
                const provider = aiProviders.find(p => p.id === def.providerId);
                return (
                  <Content key={def.providerId} component="p">
                    <b>
                      <a href={def.url} target="_blank" rel="noreferrer">
                        {def.name}
                      </a>
                    </b>
                    {provider?.description && <> — {provider.description}</>}
                  </Content>
                );
              })}
            </Content>
          )}
        </div>
      </ModalBody>
    </Modal>
  );
}
