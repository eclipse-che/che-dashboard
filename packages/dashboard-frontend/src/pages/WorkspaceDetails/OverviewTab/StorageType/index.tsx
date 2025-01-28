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
  Alert,
  AlertVariant,
  Button,
  FormGroup,
  Modal,
  ModalVariant,
  Radio,
  Text,
  TextContent,
  TextVariants,
} from '@patternfly/react-core';
import { OutlinedQuestionCircleIcon, PencilAltIcon } from '@patternfly/react-icons';
import React from 'react';
import { connect, ConnectedProps } from 'react-redux';

import overviewStyles from '@/pages/WorkspaceDetails/OverviewTab/index.module.css';
import styles from '@/pages/WorkspaceDetails/OverviewTab/StorageType/index.module.css';
import { che } from '@/services/models';
import * as storageTypeService from '@/services/storageTypes';
import { RootState } from '@/store';
import { selectBranding } from '@/store/Branding/selectors';
import { selectPvcStrategy } from '@/store/ServerConfig/selectors';

export type Props = MappedProps & {
  readonly: boolean;
  storageType?: che.WorkspaceStorageType;
  parentStorageType?: che.WorkspaceStorageType;
  onSave: (storageType: che.WorkspaceStorageType) => void;
};
export type State = {
  isSelectorOpen?: boolean;
  selected?: che.WorkspaceStorageType;
  isInfoOpen?: boolean;
};

class StorageTypeFormGroup extends React.PureComponent<Props, State> {
  storageTypes: che.WorkspaceStorageType[] = [];
  options: string[] = [];
  preferredType: che.WorkspaceStorageType;

  constructor(props: Props) {
    super(props);

    this.state = {
      isSelectorOpen: false,
      isInfoOpen: false,
    };

    const availableTypes = storageTypeService.getAvailable();

    if (Array.isArray(availableTypes)) {
      this.storageTypes = availableTypes;
      this.storageTypes.forEach(type => this.options.push(storageTypeService.toTitle(type)));
    }
    const preferredType = this.props.preferredStorageType as che.WorkspaceStorageType;
    if (preferredType) {
      this.preferredType = preferredType;
    }
  }

  public componentDidUpdate(prevProps: Props): void {
    if (prevProps.storageType !== this.props.storageType) {
      const selected = this.props.storageType;
      this.setState({ selected });
    }
  }

  public componentDidMount(): void {
    const selected = this.getSelection();
    this.setState({ selected });
  }

  private handleEditToggle(isSelectorOpen: boolean): void {
    this.setState({ isSelectorOpen });
  }

  private handleInfoToggle(): void {
    this.setState(({ isInfoOpen }) => ({
      isInfoOpen: !isInfoOpen,
    }));
  }

  private getExistingTypes(): {
    hasEphemeral: boolean;
    hasPerUser: boolean;
    hasPerWorkspace: boolean;
  } {
    const hasEphemeral = this.storageTypes.some(type => type === 'ephemeral');
    const hasPerUser = this.storageTypes.some(type => type === 'per-user');
    const hasPerWorkspace = this.storageTypes.some(type => type === 'per-workspace');

    return { hasEphemeral, hasPerUser, hasPerWorkspace };
  }

  private getInfoModalContent(): React.ReactNode {
    const { hasEphemeral, hasPerUser, hasPerWorkspace } = this.getExistingTypes();

    const ephemeralTypeDescr = hasEphemeral ? (
      <Text>
        <b>Ephemeral Storage</b> allows for faster I/O but may have limited storage and is not
        persistent.
      </Text>
    ) : (
      ''
    );
    const perUserTypeDescr = hasPerUser ? (
      <Text>
        <b>Per-user Storage</b> one PVC is provisioned per namespace. All of the workspace&apos;s
        storage (volume mounts) mounted in it on subpaths according to devworkspace ID.
      </Text>
    ) : (
      ''
    );
    const perWorkspaceTypeDescr = hasPerWorkspace ? (
      <Text>
        <b>Per-workspace Storage</b> a PVC is provisioned for each workspace within the namespace.
        All of the workspace&apos;s storage (volume mounts) are mounted on subpaths within the
        workspace&apos;s PVC.
      </Text>
    ) : (
      ''
    );

    const href = this.props.branding.docs.storageTypes;

    return (
      <TextContent>
        {perUserTypeDescr}
        {perWorkspaceTypeDescr}
        {ephemeralTypeDescr}
        <Text>
          <a rel="noreferrer" target="_blank" href={href}>
            Open documentation page
          </a>
        </Text>
      </TextContent>
    );
  }

  private getSelectorModal(): React.ReactNode {
    const { hasEphemeral, hasPerUser, hasPerWorkspace } = this.getExistingTypes();

    const isDisabled = this.props.parentStorageType !== undefined;
    const { isSelectorOpen, selected } = this.state;
    const originSelection = this.getSelection();

    const ephemeralTypeDescr = hasEphemeral ? (
      <Text component={TextVariants.h6}>
        <Radio
          label="Ephemeral"
          name="ephemeral"
          id="ephemeral-type-radio"
          description="Ephemeral Storage allows for faster I/O but may have limited storage and is not persistent."
          isChecked={selected === 'ephemeral'}
          isDisabled={isDisabled}
          onChange={() => this.setState({ selected: 'ephemeral' })}
        />
      </Text>
    ) : (
      ''
    );
    const perUserTypeDescr = hasPerUser ? (
      <Text component={TextVariants.h6}>
        <Radio
          label="Per-user"
          name="per-user"
          id="per-user-type-radio"
          description="Per-user Storage. One PVC is provisioned per user namespace and used by all workspaces of a given user"
          isChecked={selected === 'per-user'}
          isDisabled={isDisabled}
          onChange={() => this.setState({ selected: 'per-user' })}
        />
      </Text>
    ) : (
      ''
    );
    const perWorkspaceTypeDescr = hasPerWorkspace ? (
      <Text component={TextVariants.h6}>
        <Radio
          label="Per-workspace"
          name="per-workspace"
          id="per-workspace-type-radio"
          description="Per-workspace Storage. One PVC is provisioned for each workspace within the namespace."
          isChecked={selected === 'per-workspace'}
          isDisabled={isDisabled}
          onChange={() => this.setState({ selected: 'per-workspace' })}
        />
      </Text>
    ) : (
      ''
    );

    return (
      <Modal
        variant={ModalVariant.small}
        isOpen={isSelectorOpen}
        className={styles.modalEditStorageType}
        title="Change Storage Type"
        onClose={() => this.handleCancelChanges()}
        actions={[
          <Button
            key="confirm"
            variant="primary"
            isDisabled={originSelection === selected}
            onClick={() => this.handleConfirmChanges()}
          >
            Save
          </Button>,
          <Button key="cancel" variant="secondary" onClick={() => this.handleCancelChanges()}>
            Cancel
          </Button>,
        ]}
      >
        <TextContent>
          <Alert
            variant={AlertVariant.warning}
            className={styles.warningAlert}
            title={
              isDisabled
                ? 'Storage type is already defined in parent, you cannot change it.'
                : 'Note that after changing the storage type you may lose workspace data.'
            }
            isInline
          />
          <Text component={TextVariants.h6}>Select the storage type</Text>
          {perUserTypeDescr}
          {perWorkspaceTypeDescr}
          {ephemeralTypeDescr}
        </TextContent>
      </Modal>
    );
  }

  private handleConfirmChanges(): void {
    const selection = this.state.selected as che.WorkspaceStorageType;
    this.props.onSave(selection);
    this.setState({
      selected: selection,
      isSelectorOpen: false,
    });
  }

  private getSelection(): che.WorkspaceStorageType {
    if (this.props.parentStorageType) {
      return this.props.parentStorageType;
    } else if (this.props.storageType) {
      return this.props.storageType;
    }

    return this.preferredType;
  }

  private handleCancelChanges(): void {
    const originSelection = this.getSelection();
    this.setState({ selected: originSelection });
    this.handleEditToggle(false);
  }

  public render(): React.ReactNode {
    const { readonly } = this.props;
    const { selected, isInfoOpen } = this.state;

    return (
      <FormGroup
        label="Storage Type"
        fieldId="storage-type"
        labelIcon={
          <Button
            variant="plain"
            onClick={() => this.handleInfoToggle()}
            className={styles.labelIcon}
            title="Storage Type Info"
          >
            <OutlinedQuestionCircleIcon />
          </Button>
        }
      >
        {readonly && <span className={overviewStyles.readonly}>{selected}</span>}
        {!readonly && (
          <span className={overviewStyles.editable}>
            {selected}
            <Button
              data-testid="overview-storage-edit-toggle"
              variant="plain"
              onClick={() => this.handleEditToggle(true)}
              title="Change Storage Type"
            >
              <PencilAltIcon />
            </Button>
          </span>
        )}
        {this.getSelectorModal()}
        <Modal
          title="Storage Type Info"
          variant={ModalVariant.small}
          isOpen={isInfoOpen}
          onClose={() => {
            this.handleInfoToggle();
          }}
        >
          {this.getInfoModalContent()}
        </Modal>
      </FormGroup>
    );
  }
}

const mapStateToProps = (state: RootState) => ({
  branding: selectBranding(state),
  preferredStorageType: selectPvcStrategy(state),
});

const connector = connect(mapStateToProps, null, null, {
  // forwardRef is mandatory for using `@react-mock/state` in unit tests
  forwardRef: true,
});

type MappedProps = ConnectedProps<typeof connector>;
export default connector(StorageTypeFormGroup);
