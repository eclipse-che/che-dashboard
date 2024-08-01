/*
 * Copyright (c) 2018-2024 Red Hat, Inc.
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
  Button,
  ButtonVariant,
  Checkbox,
  Modal,
  ModalVariant,
  Text,
  TextContent,
} from '@patternfly/react-core';
import React from 'react';

import SessionStorageService, { SessionStorageKey } from '@/services/session-storage';

export type Props = {
  location: string;
  isOpen: boolean;
  onClose?: () => void;
  onContinue: () => void;
};
export type State = {
  isTrusted: boolean;
  trustAllCheckbox: boolean;
};

export class UntrustedSourceModal extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);

    this.state = {
      isTrusted: UntrustedSourceModal.isSourceTrusted(props.location),
      trustAllCheckbox: false,
    };
  }

  static isSourceTrusted(location: string): boolean {
    const trustedSources = SessionStorageService.get(SessionStorageKey.TRUSTED_SOURCES);
    if (!trustedSources) {
      return false;
    } else if (trustedSources === 'all') {
      return true;
    }

    const trustedSourcesArray = trustedSources.split(',');
    return trustedSourcesArray.includes(location);
  }

  static updateTrustedSources(location: string, trustAll: boolean): void {
    const trustedSources = SessionStorageService.get(SessionStorageKey.TRUSTED_SOURCES);
    if (trustedSources === 'all') {
      return;
    } else if (trustAll) {
      SessionStorageService.update(SessionStorageKey.TRUSTED_SOURCES, 'all');
    } else {
      const prevArray = trustedSources ? trustedSources.split(',') : [];
      const trustedSourcesSet = new Set(prevArray);
      trustedSourcesSet.add(location);
      const nextArray = Array.from(trustedSourcesSet);
      SessionStorageService.update(SessionStorageKey.TRUSTED_SOURCES, nextArray.join(','));
    }
  }

  public shouldComponentUpdate(nextProps: Readonly<Props>, nextState: Readonly<State>): boolean {
    if (this.props.isOpen !== nextProps.isOpen) {
      return true;
    }

    if (this.props.location !== nextProps.location) {
      return true;
    }

    if (this.state.trustAllCheckbox !== nextState.trustAllCheckbox) {
      return true;
    }

    const isTrusted = UntrustedSourceModal.isSourceTrusted(this.props.location);
    if (isTrusted !== nextState.isTrusted) {
      return true;
    }

    return false;
  }

  public componentDidMount(): void {
    this.init();
  }

  public componentDidUpdate(): void {
    this.init();
  }

  private init() {
    const isTrusted = UntrustedSourceModal.isSourceTrusted(this.props.location);
    if (this.props.isOpen && isTrusted) {
      this.setState({
        isTrusted,
        trustAllCheckbox: false,
      });

      this.props.onContinue();
    } else {
      this.setState({
        isTrusted,
      });
    }
  }

  private handleTrustAllToggle(checked: boolean): void {
    this.setState({ trustAllCheckbox: checked });
  }

  private handleClose(): void {
    this.setState({ trustAllCheckbox: false });

    this.props.onClose?.();
  }

  private handleContinue(): void {
    UntrustedSourceModal.updateTrustedSources(this.props.location, this.state.trustAllCheckbox);

    this.setState({ trustAllCheckbox: false });

    this.props.onContinue();
    this.props.onClose?.();
  }

  private buildModalFooter(): React.ReactNode {
    return (
      <React.Fragment>
        <Button
          key="continue"
          variant={ButtonVariant.primary}
          onClick={() => this.handleContinue()}
        >
          Continue
        </Button>
        <Button key="cancel" variant={ButtonVariant.link} onClick={() => this.handleClose()}>
          Cancel
        </Button>
      </React.Fragment>
    );
  }

  private buildModalBody(): React.ReactNode {
    const { trustAllCheckbox: isChecked } = this.state;
    return (
      <TextContent>
        <Text>
          Click <b>Continue</b> to proceed creating a new workspace from this source.
        </Text>
        <Checkbox
          id="trust-all-repos-checkbox"
          isChecked={isChecked}
          label="Do not ask me again (within this session)"
          onChange={(checked: boolean) => {
            this.handleTrustAllToggle(checked);
          }}
        />
      </TextContent>
    );
  }

  render(): React.ReactNode {
    const { isOpen } = this.props;
    const { isTrusted } = this.state;

    if (isTrusted) {
      return null;
    }

    const title = 'Untrusted Source';
    const footer = this.buildModalFooter();
    const body = this.buildModalBody();

    return (
      <Modal
        footer={footer}
        isOpen={isOpen}
        title={title}
        titleIconVariant="warning"
        variant={ModalVariant.small}
        onClose={() => this.handleClose()}
      >
        {body}
      </Modal>
    );
  }
}
