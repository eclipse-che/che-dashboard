/*
 * Copyright (c) 2018-2020 Red Hat, Inc.
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
  AlertActionCloseButton,
  AlertGroup,
  AlertVariant,
  PageSection,
  PageSectionVariants,
  Tab,
  Tabs,
  Wizard,
  WizardStep,
} from '@patternfly/react-core';
import { CheckCircleIcon } from '@patternfly/react-icons';
import { ExclamationCircleIcon, InProgressIcon } from '@patternfly/react-icons/dist/js/icons';
import React, { RefObject } from 'react';
import Head from '../../components/Head';
import Header from '../../components/Header';
import WorkspaceLogs from '../../components/LogsTab';
import { LoadIdeSteps } from '../../containers/IdeLoader';
import { delay } from '../../services/helpers/delay';
import { IdeLoaderTabs, WorkspaceStatus } from '../../services/helpers/types';

import workspaceStatusLabelStyles from '../../components/WorkspaceStatusLabel/index.module.css';
import './IdeLoader.styl';

export const SECTION_THEME = PageSectionVariants.light;

type Props = {
  hasError: boolean,
  currentStep: LoadIdeSteps,
  workspaceName: string;
  workspaceId: string;
  preselectedTabKey?: IdeLoaderTabs
  ideUrl?: string;
  callbacks?: {
    showAlert?: (alertOptions: AlertOptions) => void
  }
};

type State = {
  ideUrl?: string;
  workspaceId: string;
  loaderVisible: boolean;
  alertVisible: boolean;
  activeTabKey: IdeLoaderTabs;
  currentRequestError: string;
  currentAlertVariant?: AlertVariant;
  alertActionLinks?: React.ReactFragment;
  alertBody?: string | undefined;
};

export type AlertOptions = {
  title: string;
  timeDelay?: number;
  alertActionLinks?: React.ReactFragment;
  alertVariant: AlertVariant;
  body?: string;
};

class IdeLoader extends React.PureComponent<Props, State> {
  private loaderTimer;
  private readonly hideAlert: () => void;
  private readonly handleTabClick: (event: React.MouseEvent<HTMLElement, MouseEvent>, tabIndex: React.ReactText) => void;
  public showAlert: (options: AlertOptions) => void;

  private readonly wizardRef: RefObject<any>;

  constructor(props) {
    super(props);

    this.state = {
      alertVisible: false,
      loaderVisible: false,
      currentRequestError: '',
      workspaceId: this.props.workspaceId,
      activeTabKey: this.props.preselectedTabKey ? this.props.preselectedTabKey : IdeLoaderTabs.Progress,
    };

    this.wizardRef = React.createRef();

    // Toggle currently active tab
    this.handleTabClick = (event: React.MouseEvent<HTMLElement, MouseEvent>, tabIndex: React.ReactText): void => {
      this.setState({ activeTabKey: tabIndex as IdeLoaderTabs });
      if (this.state.activeTabKey === IdeLoaderTabs.Progress) {
        this.setState({ alertVisible: false });
      }
    };
    // Init showAlert
    let showAlertTimer;
    this.showAlert = (alertOptions: AlertOptions): void => {
      this.setState({ currentRequestError: alertOptions.title, currentAlertVariant: alertOptions.alertVariant, alertActionLinks: alertOptions?.alertActionLinks, alertBody: alertOptions?.body });
      if (this.state.activeTabKey === IdeLoaderTabs.Progress) {
        return;
      }
      this.setState({ alertVisible: true });
      if (showAlertTimer) {
        clearTimeout(showAlertTimer);
      }
      showAlertTimer = setTimeout(() => {
        this.setState({ alertVisible: false });
      }, alertOptions.alertVariant === AlertVariant.success ? 2000 : 10000);
    };
    this.hideAlert = (): void => this.setState({ alertVisible: false });
    // Prepare showAlert as a callback
    if (this.props.callbacks && !this.props.callbacks.showAlert) {
      this.props.callbacks.showAlert = (alertOptions: AlertOptions) => {
        this.showAlert(alertOptions);
      };
    }
  }

  private async handleMessage(event: MessageEvent): Promise<void> {
    const { data } = event;
    if (data === 'hide-navbar' && this.state.loaderVisible) {
      if (this.loaderTimer) {
        clearTimeout(this.loaderTimer);
      }
      await delay(150);
      this.setState({ loaderVisible: false });
    }
  }

  public componentDidMount(): void {
    window.addEventListener('message', event => this.handleMessage(event), false);
    if (this.props.ideUrl) {
      this.setState({ ideUrl: this.props.ideUrl });
    }
    if (this.props.workspaceId) {
      this.setState({ workspaceId: this.props.workspaceId });
    }
  }

  public componentWillUnmount(): void {
    if (this.loaderTimer) {
      clearTimeout(this.loaderTimer);
    }
    window.removeEventListener('message', event => this.handleMessage(event), false);
  }

  public async componentDidUpdate(): Promise<void> {
    const { currentStep, hasError, ideUrl, workspaceId } = this.props;

    const current = this.wizardRef.current;
    if (current && current.state && current.state.currentStep !== currentStep && !hasError) {
      current.state.currentStep = currentStep;
    }

    if (!hasError && this.state.currentRequestError) {
      this.setState({ currentRequestError: '' });
    }

    if (this.state.workspaceId !== workspaceId) {
      this.setState({
        workspaceId,
        alertVisible: false,
        loaderVisible: false,
      });
      if (this.loaderTimer) {
        clearTimeout(this.loaderTimer);
      }
    }

    if (this.state.ideUrl !== ideUrl) {
      this.setState({ ideUrl });
      if (ideUrl) {
        this.setState({ loaderVisible: true });
        if (this.loaderTimer) {
          clearTimeout(this.loaderTimer);
        }
        this.loaderTimer = setTimeout(() => {
          // todo improve this temporary solution for the debugging session
          if (window.location.origin.includes('://localhost')) {
            window.location.href = ideUrl;
          }
          if (this.state.loaderVisible) {
            this.setState({ loaderVisible: false });
          }
        }, 60000);
        await this.updateIdeIframe(ideUrl, 10);
      }
    }
  }

  private async updateIdeIframe(url: string, repeat?: number): Promise<void> {
    const element = document.getElementById('ide-iframe');
    if (element && element['contentWindow']) {
      const keycloak = window['_keycloak'] ? JSON.stringify(window['_keycloak']) : '';
      if (!keycloak) {
        element['src'] = url;
        return;
      }
      const doc = element['contentWindow'].document;
      doc.open();
      doc.write(`<!DOCTYPE html>
                 <html lang="en">
                 <head><meta charset="UTF-8"></head>
                 <body>
                   <script>
                     window._keycloak = JSON.parse('${keycloak}');
                     window.location.href = '${url}';
                   </script>
                 </body>
                 </html>`);
      doc.close();
    } else if (repeat) {
      await delay(500);
      return this.updateIdeIframe(url, --repeat);
    } else {
      const message = 'Cannot find IDE iframe element.';
      this.showAlert({
        alertVariant: AlertVariant.warning,
        title: message
      });
      console.error(message);
    }
  }

  private getIcon(step: LoadIdeSteps, className = ''): React.ReactNode {
    const { currentStep, hasError } = this.props;
    if (currentStep > step) {
      return (<React.Fragment>
        <CheckCircleIcon className={className} color="green" />
      </React.Fragment>);
    } else if (currentStep === step) {
      if (hasError) {
        return <ExclamationCircleIcon className={className} color="red" />;
      }
      return (<React.Fragment>
        <InProgressIcon className={`${workspaceStatusLabelStyles.rotate} ${className}`} color="#0e6fe0" />
      </React.Fragment>);
    }
    return '';
  }

  private getSteps(): WizardStep[] {
    const { currentStep, hasError } = this.props;

    const getTitle = (step: LoadIdeSteps, title: string, iconClass?: string) => {
      let className = '';
      if (currentStep === step) {
        className = hasError ? 'error' : 'progress';
      }
      return (
        <React.Fragment>
          {this.getIcon(step, iconClass)}
          <span className={className}>{title}</span>
        </React.Fragment>
      );
    };

    return [
      {
        id: LoadIdeSteps.INITIALIZING,
        name: getTitle(
          LoadIdeSteps.INITIALIZING,
          'Initializing',
          'wizard-icon'),
        canJumpTo: currentStep >= LoadIdeSteps.INITIALIZING,
      },
      {
        id: LoadIdeSteps.START_WORKSPACE,
        name: getTitle(
          LoadIdeSteps.START_WORKSPACE,
          'Waiting for workspace to start',
          'wizard-icon'),
        canJumpTo: currentStep >= LoadIdeSteps.START_WORKSPACE,
      },
      {
        id: LoadIdeSteps.OPEN_IDE,
        name: getTitle(
          LoadIdeSteps.OPEN_IDE,
          'Open IDE',
          'wizard-icon'),
        canJumpTo: currentStep >= LoadIdeSteps.OPEN_IDE,
      },
    ];
  }

  public render(): React.ReactElement {
    const { workspaceName, workspaceId, ideUrl, hasError, currentStep } = this.props;
    const { alertVisible, loaderVisible, currentAlertVariant, currentRequestError, alertActionLinks } = this.state;

    if (ideUrl) {
      return (
        <div className="ide-iframe-page">
          {loaderVisible && (
            <div className="main-page-loader">
              <div className="ide-page-loader-content">
                <img src="./assets/branding/loader.svg" />
              </div>
            </div>
          )}
          <iframe id="ide-iframe" src="./static/loader.html" allow="fullscreen *" />
        </div>
      );
    }

    return (
      <React.Fragment>
        <Head pageName={`Loading ${workspaceName}`} />
        {alertVisible && (
          <AlertGroup isToast>
            <Alert
              variant={currentAlertVariant}
              title={currentRequestError}
              actionClose={<AlertActionCloseButton onClose={this.hideAlert} />}
            />
          </AlertGroup>
        )}
        <Header title={`Starting workspace ${workspaceName}`}
          status={WorkspaceStatus[hasError ? WorkspaceStatus.ERROR : WorkspaceStatus.STARTING]} />
        <PageSection variant={SECTION_THEME} className="ide-loader-page" isFilled={true}>
          <Tabs activeKey={this.state.activeTabKey} onSelect={this.handleTabClick} inset={{ default: 'insetLg' }}
            id="ide-loader-page-tabs">
            <Tab eventKey={IdeLoaderTabs.Progress} title={IdeLoaderTabs[IdeLoaderTabs.Progress]}
              id="ide-loader-page-wizard-tab">
              <PageSection>
                {(this.state.currentRequestError) && (
                  <Alert
                    isInline
                    variant={currentAlertVariant}
                    title={currentRequestError}
                    actionClose={<AlertActionCloseButton
                      onClose={() => this.setState({ currentRequestError: '' })} />}
                    actionLinks={alertActionLinks}
                  >
                    {this.state.alertBody}
                  </Alert>
                )}
                <Wizard
                  className="ide-loader-wizard"
                  steps={this.getSteps()}
                  ref={this.wizardRef}
                  footer={(<span />)}
                  height={500}
                  startAtStep={currentStep}
                />
              </PageSection>
            </Tab>
            <Tab eventKey={IdeLoaderTabs.Logs} title={IdeLoaderTabs[IdeLoaderTabs.Logs]}
              id="ide-loader-page-logs-tab">
              <WorkspaceLogs workspaceId={workspaceId} />
            </Tab>
          </Tabs>
        </PageSection>
      </React.Fragment>
    );
  }
}

export default IdeLoader;
