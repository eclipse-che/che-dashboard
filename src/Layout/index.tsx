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
import { Page, AlertVariant } from '@patternfly/react-core';
import { History } from 'history';
import { matchPath } from 'react-router';

import Header from './Header';
import Sidebar from './Sidebar';
import { ThemeVariant } from './themeVariant';
import { AppState } from '../store';
import { lazyInject } from '../inversify.config';
import { AppAlerts } from '../services/alerts/appAlerts';
import { KeycloakAuthService } from '../services/keycloak/auth';
import { IssuesReporterService } from '../services/bootstrap/issuesReporter';
import { ErrorReporter } from './ErrorReporter';
import { IssueComponent } from './ErrorReporter/Issue';
import { BannerAlert } from '../components/BannerAlert';
import { ErrorBoundary } from './ErrorBoundary';
import { DisposableCollection } from '../services/helpers/disposable';
import { ROUTE } from '../route.enum';
import { selectRegistriesErrors, selectDevfileSchemaError } from '../store/DevfileRegistries/selectors';
import { selectUserError, selectUser } from '../store/User/selectors';
import { selectPluginsError } from '../store/Plugins/chePlugins/selectors';
import { selectDwPluginsError } from '../store/Plugins/devWorkspacePlugins/selectors';
import { selectInfrastructureNamespacesError } from '../store/InfrastructureNamespaces/selectors';
import { selectUserProfileError } from '../store/UserProfile/selectors';
import { selectWorkspacesSettingsError } from '../store/Workspaces/Settings/selectors';
import { selectWorkspacesError } from '../store/Workspaces/selectors';
import { selectBranding } from '../store/Branding/selectors';

const THEME_KEY = 'theme';
const IS_MANAGED_SIDEBAR = false;

type Props =
  MappedProps
  & {
    children: React.ReactNode;
    history: History;
  };
type State = {
  isSidebarVisible: boolean;
  isHeaderVisible: boolean;
  theme: ThemeVariant;
};

export class Layout extends React.PureComponent<Props, State> {

  @lazyInject(AppAlerts)
  private readonly appAlerts: AppAlerts;

  @lazyInject(IssuesReporterService)
  private readonly issuesReporterService: IssuesReporterService;

  @lazyInject(KeycloakAuthService)
  private readonly keycloakAuthService: KeycloakAuthService;

  private readonly toDispose = new DisposableCollection();

  constructor(props: Props) {
    super(props);

    const theme: ThemeVariant = window.sessionStorage.getItem(THEME_KEY) as ThemeVariant || ThemeVariant.DARK;

    this.state = {
      isHeaderVisible: true,
      isSidebarVisible: true,
      theme,
    };
  }

  private logout(): void {
    this.keycloakAuthService.logout();
  }

  private toggleNav(): void {
    this.setState({
      isSidebarVisible: !this.state.isSidebarVisible,
    });
    window.postMessage('toggle-navbar', '*');
  }

  private changeTheme(theme: ThemeVariant): void {
    this.setState({ theme });
    window.sessionStorage.setItem(THEME_KEY, theme);
  }

  /**
   * Returns `true` if current location matches the IDE page path.
   */
  private testIdePath(): boolean {
    const currentPath = this.props.history.location.pathname;
    const match = matchPath(currentPath, {
      path: ROUTE.IDE_LOADER,
      exact: true,
      strict: false,
    });
    return match !== null;
  }

  public componentDidMount(): void {
    this.listenToIframeMessages();
    this.reportPreloadErrors();
  }

  public componentWillUnmount(): void {
    this.toDispose.dispose();
  }

  private listenToIframeMessages() {
    const handleMessage = (event: MessageEvent): void => {
      if (typeof event.data !== 'string') {
        return;
      }

      if (event.data === 'show-navbar') {
        this.setState({
          isSidebarVisible: true,
          isHeaderVisible: true,
        });
      }
      else if (event.data === 'hide-navbar') {
        const isHeaderVisible = !this.testIdePath() || document.getElementById('ide-iframe') === null;
        this.setState({
          isSidebarVisible: false,
          isHeaderVisible,
        });
      }
    };
    window.addEventListener('message', handleMessage, false);
    this.toDispose.push({
      dispose: () => {
        window.removeEventListener('message', handleMessage);
      },
    });
  }

  private reportPreloadErrors(): void {
    // workspaces errors
    if (this.props.workspacesError) {
      this.appAlerts.showAlert({
        key: 'workspaces-error',
        title: this.props.workspacesError,
        variant: AlertVariant.danger,
      });
    }
    // devfile registries
    if (this.props.registriesErrors.length > 0) {
      this.props.registriesErrors.forEach(error => {
        this.appAlerts.showAlert({
          key: 'registry-error-' + error.url,
          title: error.errorMessage,
          variant: AlertVariant.danger,
        });
      });
    }
    // user
    if (this.props.userError) {
      this.appAlerts.showAlert({
        key: 'user-error',
        title: this.props.userError,
        variant: AlertVariant.danger,
      });
    }
    // plugins
    if (this.props.pluginsError) {
      this.appAlerts.showAlert({
        key: 'plugins-error',
        title: this.props.pluginsError,
        variant: AlertVariant.danger,
      });
    }
    // devWorkspace plugins
    if (this.props.dwPluginsError) {
      this.appAlerts.showAlert({
        key: 'dw-plugins-error',
        title: this.props.dwPluginsError,
        variant: AlertVariant.danger,
      });
    }
    // infrastructure namespace error
    if (this.props.infrastructureNamespacesError) {
      this.appAlerts.showAlert({
        key: 'infrastructure-namespaces-error',
        title: this.props.infrastructureNamespacesError,
        variant: AlertVariant.danger,
      });
    }
    // devfile schema error
    if (this.props.devfileSchemaError) {
      this.appAlerts.showAlert({
        key: 'devfile-schema-error',
        title: this.props.devfileSchemaError,
        variant: AlertVariant.danger,
      });
    }
    // user profile error
    if (this.props.userProfileError) {
      this.appAlerts.showAlert({
        key: 'user-profile-error',
        title: this.props.userProfileError,
        variant: AlertVariant.danger,
      });
    }
    // workspaces settings error
    if (this.props.workspacesSettingsError) {
      this.appAlerts.showAlert({
        key: 'workspace-settings-error',
        title: this.props.workspacesSettingsError,
        variant: AlertVariant.danger,
      });
    }
  }

  public render(): React.ReactElement {
    /* check for startup issues */
    if (this.issuesReporterService.hasIssue) {
      const issue = this.issuesReporterService.reportIssue();
      const brandingData = this.props.branding;
      if (issue) {
        return (
          <ErrorReporter>
            <IssueComponent
              branding={brandingData}
              issue={issue}
            />
          </ErrorReporter>
        );
      }
    }

    const { isHeaderVisible, isSidebarVisible, theme } = this.state;
    const { history, user } = this.props;

    const logoUrl = this.props.branding.logoFile;

    return (
      <Page
        header={
          <Header
            history={history}
            isVisible={isHeaderVisible}
            logoUrl={logoUrl}
            user={user}
            logout={() => this.logout()}
            toggleNav={() => this.toggleNav()}
            changeTheme={theme => this.changeTheme(theme)}
          />
        }
        sidebar={
          <Sidebar
            isManaged={IS_MANAGED_SIDEBAR}
            isNavOpen={isSidebarVisible}
            history={history}
            theme={theme}
          />
        }
        isManagedSidebar={IS_MANAGED_SIDEBAR}
      >
        <ErrorBoundary>
          <BannerAlert />
          {this.props.children}
        </ErrorBoundary>
      </Page>
    );
  }

}

const mapStateToProps = (state: AppState) => ({
  branding: selectBranding(state),
  user: selectUser(state),
  userError: selectUserError(state),
  registriesErrors: selectRegistriesErrors(state),
  pluginsError: selectPluginsError(state),
  dwPluginsError: selectDwPluginsError(state),
  infrastructureNamespacesError: selectInfrastructureNamespacesError(state),
  devfileSchemaError: selectDevfileSchemaError(state),
  userProfileError: selectUserProfileError(state),
  workspacesSettingsError: selectWorkspacesSettingsError(state),
  workspacesError: selectWorkspacesError(state),
});

const connector = connect(
  mapStateToProps
);

type MappedProps = ConnectedProps<typeof connector>
export default connector(Layout);
