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

import { AlertVariant, Brand, Page } from '@patternfly/react-core';
import { History } from 'history';
import React from 'react';
import { connect, ConnectedProps } from 'react-redux';
import { matchPath } from 'react-router-dom';

import { BannerAlert } from '@/components/BannerAlert';
import { CheLogo } from '@/components/CheLogo';
import { ToggleBarsContext } from '@/contexts/ToggleBars';
import { container } from '@/inversify.config';
import { ErrorBoundary } from '@/Layout/ErrorBoundary';
import { ErrorReporter } from '@/Layout/ErrorReporter';
import { IssueComponent } from '@/Layout/ErrorReporter/Issue';
import { Header } from '@/Layout/Header';
import { Sidebar } from '@/Layout/Sidebar';
import StoreErrorsAlert from '@/Layout/StoreErrorsAlert';
import { ROUTE } from '@/Routes';
import { AppAlerts } from '@/services/alerts/appAlerts';
import { IssuesReporterService } from '@/services/bootstrap/issuesReporter';
import { WarningsReporterService } from '@/services/bootstrap/warningsReporter';
import { buildLogoSrc } from '@/services/helpers/brandingLogo';
import { signOut } from '@/services/helpers/login';
import { RootState } from '@/store';
import { selectBranding } from '@/store/Branding/selectors';
import { sanityCheckActionCreators } from '@/store/SanityCheck';
import { selectSanityCheckError } from '@/store/SanityCheck/selectors';
import { selectDashboardLogo } from '@/store/ServerConfig/selectors';

type Props = MappedProps & {
  children: React.ReactNode;
  history: History;
};

const LayoutComponent: React.FC<Props> = props => {
  const [isHeaderVisible, setIsHeaderVisible] = React.useState(true);
  const [isSidebarVisible, setIsSidebarVisible] = React.useState(true);

  const issuesReporterService = container.get(IssuesReporterService);
  const warningsReporterService = container.get(WarningsReporterService);
  const appAlerts = container.get(AppAlerts);

  const hideAllBars = React.useCallback(() => {
    setIsHeaderVisible(false);
    setIsSidebarVisible(false);
  }, []);

  const showAllBars = React.useCallback(() => {
    setIsHeaderVisible(true);
    setIsSidebarVisible(true);
  }, []);

  const showWarnings = React.useCallback(() => {
    const warnings = warningsReporterService.reportAllWarnings();
    warnings.forEach(warning => {
      appAlerts.showAlert({
        key: warning.key,
        title: warning.title,
        variant: AlertVariant.warning,
        timeout: 9999999,
      });
    });
  }, [warningsReporterService, appAlerts]);

  const testBackends = React.useCallback(
    async (error?: string) => {
      try {
        await props.testBackends();
      } catch (e) {
        if (error) {
          console.error(error);
        }
        console.error('Error testing backends:', props.sanityCheckError);
      }
    },
    [props],
  );

  React.useEffect(() => {
    const matchFactoryLoaderPath = matchPath(ROUTE.FACTORY_LOADER, props.history.location.pathname);
    const matchIdeLoaderPath = matchPath(ROUTE.IDE_LOADER, props.history.location.pathname);
    if (matchFactoryLoaderPath !== null || matchIdeLoaderPath !== null) {
      hideAllBars();
    }
    showWarnings();
  }, [props.history.location.pathname, hideAllBars, showWarnings]);

  /* check for startup issues */
  if (issuesReporterService.hasIssue) {
    const issue = issuesReporterService.reportIssue();
    const brandingData = props.branding;
    if (issue) {
      return (
        <ErrorReporter>
          <IssueComponent branding={brandingData} issue={issue} />
        </ErrorReporter>
      );
    }
  }

  const { history, branding, dashboardLogo } = props;

  // Use inline SVG for .svg files, otherwise use img tag
  const isSvgLogo = branding.logoFile?.toLowerCase().endsWith('.svg');
  const logoElement = isSvgLogo ? (
    <CheLogo height="36px" width="auto" alt="Logo" />
  ) : (
    <Brand
      src={buildLogoSrc(dashboardLogo, branding.logoFile)}
      alt="Logo"
      heights={{ default: '36px' }}
    />
  );

  const masthead = (
    <Header
      history={history}
      isVisible={isHeaderVisible}
      logo={logoElement}
      logout={() => signOut()}
    />
  );

  const sidebar = <Sidebar history={history} isVisible={isSidebarVisible} />;

  return (
    <ToggleBarsContext.Provider
      value={{
        hideAll: hideAllBars,
        showAll: showAllBars,
      }}
    >
      <Page masthead={masthead} sidebar={sidebar} isManagedSidebar>
        <ErrorBoundary onError={error => testBackends(error)}>
          <StoreErrorsAlert />
          <BannerAlert />
          {props.children}
        </ErrorBoundary>
      </Page>
    </ToggleBarsContext.Provider>
  );
};

export const Layout = LayoutComponent;

const mapStateToProps = (state: RootState) => ({
  branding: selectBranding(state),
  dashboardLogo: selectDashboardLogo(state),
  sanityCheckError: selectSanityCheckError(state),
});

const connector = connect(mapStateToProps, sanityCheckActionCreators);

type MappedProps = ConnectedProps<typeof connector>;
export default connector(Layout);
