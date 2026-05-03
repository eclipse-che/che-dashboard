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
import {
  Button,
  Checkbox,
  Content,
  ContentVariants,
  Modal,
  ModalBody,
  ModalFooter,
  ModalHeader,
  ModalVariant,
} from '@patternfly/react-core';
import React from 'react';

type Props = {
  isOpen: boolean;
  aiTools: api.AiToolDefinition[];
  aiProviders: api.AiProviderDefinition[];
  selected: string[];
  originSelection: string[];
  onToggle: (toolId: string) => void;
  onConfirm: () => void;
  onCancel: () => void;
};

export class AiToolSelectorModal extends React.PureComponent<Props> {
  public render(): React.ReactNode {
    const {
      isOpen,
      aiTools,
      aiProviders,
      selected,
      originSelection,
      onToggle,
      onConfirm,
      onCancel,
    } = this.props;

    const hasChanged =
      selected.length !== originSelection.length ||
      selected.some(id => !originSelection.includes(id));

    return (
      <Modal
        variant={ModalVariant.small}
        isOpen={isOpen}
        onClose={onCancel}
        elementToFocus="[data-pf-initial-focus]"
      >
        <ModalHeader title="Change AI Tools" />
        <ModalBody>
          <Content data-pf-initial-focus tabIndex={-1} style={{ outline: 'none' }}>
            {aiTools.length === 0 ? (
              <Content component="p">
                No AI tools are available. Ask your administrator to configure AI tools in the
                CheCluster custom resource.
              </Content>
            ) : (
              <>
                <Content component={ContentVariants.h6}>Select AI coding tools</Content>
                {aiTools.map(def => {
                  const provider = aiProviders.find(p => p.id === def.providerId);
                  return (
                    <Content key={def.providerId} component={ContentVariants.h6}>
                      <Checkbox
                        label={def.name}
                        id={`ai-tool-${def.providerId.replace(/\//g, '-')}-checkbox`}
                        description={provider?.description}
                        isChecked={selected.includes(def.providerId)}
                        onChange={() => onToggle(def.providerId)}
                      />
                    </Content>
                  );
                })}
              </>
            )}
          </Content>
        </ModalBody>
        <ModalFooter>
          <Button key="confirm" variant="primary" isDisabled={!hasChanged} onClick={onConfirm}>
            Save
          </Button>
          <Button key="cancel" variant="secondary" onClick={onCancel}>
            Cancel
          </Button>
        </ModalFooter>
      </Modal>
    );
  }
}
