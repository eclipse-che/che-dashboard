/*
 * Copyright (c) 2018-2021 Red Hat, Inc.
 * This program and the accompanying materials are made
 * available under the terms of the Eclipse Public License 2.0
 * which is available at https://www.eclipse.org/legal/epl-2.0/
 *
 * SPDX-License-Identifier: EPL-2.0
 *
 * Contributors:
 *   Red Hat, Inc. - initial API and implementation
 */

import React from 'react';
import { connect, ConnectedProps } from 'react-redux';
import {
  Alert,
  AlertActionCloseButton,
  AlertGroup,
  AlertVariant,
  Flex,
  FlexItem,
  FormGroup,
  Text,
  TextContent,
  TextVariants,
} from '@patternfly/react-core';
import { AppState } from '../../../../store';
import * as DevfileRegistriesStore from '../../../../store/DevfileRegistries';
import * as FactoryResolverStore from '../../../../store/FactoryResolver';
import { GitRepoLocationInput } from './GitRepoLocationInput';
import { AlertItem } from '../../../../services/helpers/types';

type Props =
  MappedProps
  & {
    onDevfileResolve: (devfile: che.WorkspaceDevfile, location: string) => void;
  };
type State = {
  isLoading: boolean;
  alerts: AlertItem[];
};

export class DevfileSelectorFormGroup extends React.PureComponent<Props, State> {
  private factoryResolver: FactoryResolverStore.State;
  private readonly devfileLocationRef: React.RefObject<GitRepoLocationInput>;

  constructor(props: Props) {
    super(props);

    this.state = {
      isLoading: false,
      alerts: [],
    };
    this.devfileLocationRef = React.createRef();
  }

  public componentDidUpdate(): void {
    this.factoryResolver = this.props.factoryResolver;
  }

  private async handleLocationChange(location: string): Promise<void> {
    try {
      this.setState({ isLoading: true });
      await this.props.requestFactoryResolver(location);
      const { resolver } = this.factoryResolver;
      this.props.onDevfileResolve(resolver.devfile as che.WorkspaceDevfile, location);
      this.setState({ isLoading: false });
    } catch (e) {
      this.setState({ isLoading: false });
      this.devfileLocationRef.current?.invalidateInput();
      this.showAlert({
        key: 'load-devfile-resolver-failed',
        title: `Failed to resolve or load the devfile. ${e}`,
        variant: AlertVariant.danger,
      });
    }
  }

  private showAlert(alert: AlertItem): void {
    const alerts = [...this.state.alerts, alert];
    this.setState({ alerts });
  }

  private removeAlert(key: string): void {
    this.setState({ alerts: [...this.state.alerts.filter(al => al.key !== key)] });
  }

  public render(): React.ReactNode {
    const { alerts, isLoading } = this.state;

    return (
      <>
        <AlertGroup isToast>
          {alerts.map(({ title, variant, key }) => (
            <Alert
              variant={variant}
              title={title}
              key={key}
              actionClose={<AlertActionCloseButton onClose={() => this.removeAlert(key)} />}
            />
          ))}
        </AlertGroup>
        <FormGroup fieldId='import-from-git' label={
          <TextContent>
            <Text component={TextVariants.h4}>
              Import from Git
            </Text>
          </TextContent>
        }>
          <Flex style={{ marginTop: '15px', minHeight: '85px' }}>
            <FlexItem>
              <TextContent>
                <Text component={TextVariants.h5}>
                  Git Repo URL
                  <span style={{ color: 'var(--pf-c-form__label-required--Color)' }}>&nbsp;*</span>
                </Text>
              </TextContent>
            </FlexItem>
            <FlexItem grow={{ default: 'grow' }}>
              <GitRepoLocationInput
                ref={this.devfileLocationRef}
                isLoading={isLoading}
                onChange={location => this.handleLocationChange(location)}
              />
            </FlexItem>
          </Flex>
        </FormGroup>
      </>
    );
  }

}

const mapStateToProps = (state: AppState) => ({
  factoryResolver: state.factoryResolver,
});

const connector = connect(
  mapStateToProps,
  {
    ...DevfileRegistriesStore.actionCreators,
    ...FactoryResolverStore.actionCreators,
  },
);

type MappedProps = ConnectedProps<typeof connector>;
export default connector(DevfileSelectorFormGroup);
