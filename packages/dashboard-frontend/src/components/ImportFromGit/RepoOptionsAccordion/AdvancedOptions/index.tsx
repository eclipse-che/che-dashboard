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

import { Form } from '@patternfly/react-core';
import React from 'react';

import { ContainerImageField } from '@/components/ImportFromGit/RepoOptionsAccordion/AdvancedOptions/ContainerImageField';
import { CpuLimitField } from '@/components/ImportFromGit/RepoOptionsAccordion/AdvancedOptions/CpuLimitField';
import { CreateNewIfExistingField } from '@/components/ImportFromGit/RepoOptionsAccordion/AdvancedOptions/CreateNewIfExistingField';
import { MemoryLimitField } from '@/components/ImportFromGit/RepoOptionsAccordion/AdvancedOptions/MemoryLimitField';
import { TemporaryStorageField } from '@/components/ImportFromGit/RepoOptionsAccordion/AdvancedOptions/TemporaryStorageField';
import { CREATE_NEW_IF_EXIST_SWITCH_ID } from '@/pages/GetStarted/SamplesList/Toolbar/CreateNewIfExistSwitch';

export type Props = {
  containerImage: string | undefined;
  temporaryStorage: boolean | undefined;
  createNewIfExisting: boolean | undefined;
  memoryLimit: number | undefined;
  cpuLimit: number | undefined;
  onChange: (
    containerImage: string | undefined,
    temporaryStorage: boolean | undefined,
    createNewIfExisting: boolean | undefined,
    memoryLimit: number | undefined,
    cpuLimit: number | undefined,
  ) => void;
};

export type State = {
  containerImage: string | undefined;
  temporaryStorage: boolean | undefined;
  createNewIfExisting: boolean | undefined;
  memoryLimit: number | undefined;
  cpuLimit: number | undefined;
};

export class AdvancedOptions extends React.PureComponent<Props, State> {
  private readonly hasCreateNewIfExistSwitch: boolean;

  constructor(props: Props) {
    super(props);

    this.state = {
      containerImage: props.containerImage,
      temporaryStorage: props.temporaryStorage,
      createNewIfExisting: props.createNewIfExisting,
      memoryLimit: props.memoryLimit,
      cpuLimit: props.cpuLimit,
    };

    this.hasCreateNewIfExistSwitch =
      window.document.getElementById(CREATE_NEW_IF_EXIST_SWITCH_ID) !== null;
  }

  public componentDidUpdate(prevProps: Readonly<Props>): void {
    const { containerImage, temporaryStorage, createNewIfExisting, memoryLimit, cpuLimit } =
      this.props;

    if (containerImage !== prevProps.containerImage) {
      this.setState({ containerImage });
    }

    if (temporaryStorage !== prevProps.temporaryStorage) {
      this.setState({ temporaryStorage });
    }

    if (createNewIfExisting !== prevProps.createNewIfExisting) {
      this.setState({ createNewIfExisting });
    }

    if (memoryLimit !== prevProps.memoryLimit) {
      this.setState({ memoryLimit });
    }

    if (cpuLimit !== prevProps.cpuLimit) {
      this.setState({ cpuLimit });
    }
  }

  private handleContainerImage(containerImage: string | undefined) {
    const { temporaryStorage, createNewIfExisting, memoryLimit, cpuLimit } = this.state;

    this.setState({ containerImage });
    this.props.onChange(
      containerImage,
      temporaryStorage,
      createNewIfExisting,
      memoryLimit,
      cpuLimit,
    );
  }

  private handleTemporaryStorage(temporaryStorage: boolean | undefined) {
    const { containerImage, createNewIfExisting, memoryLimit, cpuLimit } = this.state;

    this.setState({ temporaryStorage });
    this.props.onChange(
      containerImage,
      temporaryStorage,
      createNewIfExisting,
      memoryLimit,
      cpuLimit,
    );
  }

  private handleCreateNewIfExisting(createNewIfExisting: boolean | undefined) {
    const { containerImage, temporaryStorage, memoryLimit, cpuLimit } = this.state;

    this.setState({ createNewIfExisting });
    this.props.onChange(
      containerImage,
      temporaryStorage,
      createNewIfExisting,
      memoryLimit,
      cpuLimit,
    );
  }

  private handleMemoryLimit(memoryLimit: number | undefined) {
    const { containerImage, temporaryStorage, createNewIfExisting, cpuLimit } = this.state;

    this.setState({ memoryLimit });
    this.props.onChange(
      containerImage,
      temporaryStorage,
      createNewIfExisting,
      memoryLimit,
      cpuLimit,
    );
  }

  private handleCpuLimit(cpuLimit: number | undefined) {
    const { containerImage, temporaryStorage, createNewIfExisting, memoryLimit } = this.state;

    this.setState({ cpuLimit });
    this.props.onChange(
      containerImage,
      temporaryStorage,
      createNewIfExisting,
      memoryLimit,
      cpuLimit,
    );
  }

  public render() {
    const { containerImage, temporaryStorage, createNewIfExisting, memoryLimit, cpuLimit } =
      this.state;
    return (
      <Form isHorizontal={true} onSubmit={e => e.preventDefault()}>
        <ContainerImageField
          onChange={containerImage => this.handleContainerImage(containerImage)}
          containerImage={containerImage}
        />
        <TemporaryStorageField
          onChange={temporaryStorage => this.handleTemporaryStorage(temporaryStorage)}
          isTemporary={temporaryStorage}
        />
        <CreateNewIfExistingField
          onChange={createNewIfExisting => this.handleCreateNewIfExisting(createNewIfExisting)}
          createNewIfExisting={createNewIfExisting}
          isHidden={this.hasCreateNewIfExistSwitch}
        />
        <MemoryLimitField
          onChange={memoryLimit => this.handleMemoryLimit(memoryLimit)}
          memoryLimit={memoryLimit || 0}
        />
        <CpuLimitField
          onChange={cpuLimit => this.handleCpuLimit(cpuLimit)}
          cpuLimit={cpuLimit || 0}
        />
      </Form>
    );
  }
}
