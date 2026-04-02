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

import { api } from '@eclipse-che/common';
import { Content, Modal, ModalBody, ModalHeader, ModalVariant } from '@patternfly/react-core';
import React from 'react';

type Props = {
  isOpen: boolean;
  aiTools: api.AiToolDefinition[];
  aiProviders: api.AiProviderDefinition[];
  onClose: () => void;
};

export class AiToolInfoModal extends React.PureComponent<Props> {
  public render(): React.ReactNode {
    const { isOpen, aiTools, aiProviders, onClose } = this.props;

    return (
      <Modal
        variant={ModalVariant.small}
        isOpen={isOpen}
        onClose={onClose}
        elementToFocus="[data-pf-initial-focus]"
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
                  AI coding tools are injected into workspace containers at start via init
                  containers. The selected tool binary is copied to a shared volume and added to{' '}
                  <code>PATH</code>.
                </Content>
                {aiTools.map(def => {
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
}
