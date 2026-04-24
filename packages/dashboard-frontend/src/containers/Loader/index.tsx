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

import { helpers } from '@eclipse-che/common';
import { dump } from 'js-yaml';
import React from 'react';
import { connect, ConnectedProps } from 'react-redux';
import { Location, NavigateFunction, useLocation, useNavigate, useParams } from 'react-router-dom';

import { useTheme } from '@/contexts/ThemeContext';
import { LoaderPage } from '@/pages/Loader';
import { WorkspaceRouteParams } from '@/Routes';
import { findTargetWorkspace } from '@/services/helpers/factoryFlow/findTargetWorkspace';
import { getLoaderMode } from '@/services/helpers/factoryFlow/getLoaderMode';
import { LoaderTab } from '@/services/helpers/types';
import { Workspace } from '@/services/workspace-adapter';
import { RootState } from '@/store';
import { selectAiAgentRegistryEnabled, selectDefaultAgent } from '@/store/AiAgentRegistry';
import { selectDefaultNamespace } from '@/store/InfrastructureNamespaces/selectors';
import {
  actionCreators,
  AgentPodPhase,
  AgentPodStatus,
  clearAgentTerminalUrl,
} from '@/store/LocalDevfiles';
import { selectAgentPodStatuses, selectAgentTerminalUrl } from '@/store/LocalDevfiles/selectors';
import { selectAllWorkspaces } from '@/store/Workspaces/selectors';

type RouteParams = Partial<WorkspaceRouteParams> | undefined;

export type Props = MappedProps & {
  routeParams: RouteParams;
  location: Location;
  navigate: NavigateFunction;
  isDarkTheme: boolean;
};

export type State = {
  searchParams: URLSearchParams;
  tabParam: string | undefined;
};

const MAX_HEARTBEAT_ERRORS = 6;
const MAX_TERMINAL_POLL_ERRORS = 12;

class LoaderContainer extends React.Component<Props, State> {
  private terminalPollTimer: ReturnType<typeof setTimeout> | undefined;
  private heartbeatTimer: ReturnType<typeof setInterval> | undefined;
  private heartbeatErrorCount = 0;
  private terminalPollErrorCount = 0;
  private agentInstanceId: string | undefined;

  constructor(props: Props) {
    super(props);

    const dirtyLocation = this.props.location;
    const { search } = helpers.sanitizeLocation(dirtyLocation);
    const searchParams = new URLSearchParams(decodeURIComponent(search).replaceAll('?', '&'));
    const tabParam = searchParams.get('tab') || undefined;

    this.state = {
      searchParams,
      tabParam,
    };
  }

  componentDidMount() {
    this.initAgentInstanceId();
    window.addEventListener('beforeunload', this.handleBeforeUnload);
  }

  componentDidUpdate() {
    this.initAgentInstanceId();
    this.fetchTerminalUrlIfNeeded();
    this.manageHeartbeat();
  }

  componentWillUnmount() {
    window.removeEventListener('beforeunload', this.handleBeforeUnload);
    this.clearPollTimer();
    this.clearHeartbeat();
    if (this.agentInstanceId && this.agentPodStatus) {
      this.props.stopAgent(this.agentInstanceId);
    }
    this.props.clearAgentTerminalUrl();
  }

  private initAgentInstanceId() {
    if (this.agentInstanceId || !this.props.defaultAgent) return;
    const workspace = this.findTargetWorkspace(this.props);
    if (!workspace) return;
    const hash = this.computeHash(workspace.name);
    this.agentInstanceId = `${this.props.defaultAgent.id}-${hash}`;
  }

  private computeHash(input: string): string {
    let hash = 0;
    for (let i = 0; i < input.length; i++) {
      const ch = input.charCodeAt(i);
      hash = ((hash << 5) - hash + ch) | 0;
    }
    return Math.abs(hash).toString(36).slice(0, 6);
  }

  private get agentPodStatus(): AgentPodStatus | undefined {
    return this.props.agentPodStatuses.find(s => s.agentId === this.agentInstanceId);
  }

  private clearPollTimer() {
    if (this.terminalPollTimer) {
      clearTimeout(this.terminalPollTimer);
      this.terminalPollTimer = undefined;
    }
  }

  private clearHeartbeat() {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = undefined;
    }
  }

  private manageHeartbeat() {
    const agentPodStatus = this.agentPodStatus;
    const isRunning = agentPodStatus?.phase === AgentPodPhase.RUNNING && agentPodStatus?.ready;

    if (isRunning && this.agentInstanceId && !this.heartbeatTimer) {
      const instanceId = this.agentInstanceId;
      this.heartbeatErrorCount = 0;
      this.sendHeartbeatWithRetry(instanceId);
      this.heartbeatTimer = setInterval(() => {
        this.sendHeartbeatWithRetry(instanceId);
      }, 60_000);
    }

    if (!isRunning && this.heartbeatTimer) {
      this.clearHeartbeat();
    }
  }

  private async sendHeartbeatWithRetry(instanceId: string) {
    try {
      await this.props.sendHeartbeat(instanceId);
      this.heartbeatErrorCount = 0;
    } catch {
      this.heartbeatErrorCount++;
      if (this.heartbeatErrorCount >= MAX_HEARTBEAT_ERRORS) {
        this.clearHeartbeat();
        this.handleStopAgent();
      }
    }
  }

  private fetchTerminalUrlIfNeeded() {
    const { agentTerminalUrl } = this.props;
    const agentPodStatus = this.agentPodStatus;
    const isRunning = agentPodStatus?.phase === AgentPodPhase.RUNNING && agentPodStatus?.ready;

    if (isRunning && !agentTerminalUrl && !this.terminalPollTimer) {
      this.startTerminalPolling();
    }

    if (agentTerminalUrl) {
      this.clearPollTimer();
    }

    if (!isRunning) {
      this.clearPollTimer();
      if (agentTerminalUrl) {
        this.props.clearAgentTerminalUrl();
      }
    }
  }

  private startTerminalPolling() {
    this.terminalPollErrorCount = 0;
    const poll = async () => {
      const { agentTerminalUrl, defaultAgent } = this.props;
      const agentPodStatus = this.agentPodStatus;
      const isRunning = agentPodStatus?.phase === AgentPodPhase.RUNNING && agentPodStatus?.ready;
      if (!isRunning || agentTerminalUrl) {
        this.clearPollTimer();
        return;
      }
      if (defaultAgent && this.agentInstanceId) {
        try {
          await this.props.fetchAgentTerminalUrl(this.agentInstanceId, defaultAgent.terminalPort);
          this.terminalPollErrorCount = 0;
        } catch {
          this.terminalPollErrorCount++;
          if (this.terminalPollErrorCount >= MAX_TERMINAL_POLL_ERRORS) {
            this.clearPollTimer();
            return;
          }
        }
      }
      this.terminalPollTimer = setTimeout(poll, 3000);
    };
    poll();
  }

  private handleStartAgent = async () => {
    const { defaultAgent } = this.props;
    if (defaultAgent && this.agentInstanceId) {
      return this.props.startAgent(defaultAgent, this.agentInstanceId);
    }
  };

  private handleStopAgent = () => {
    if (this.agentInstanceId) {
      this.props.stopAgent(this.agentInstanceId);
    }
  };

  private handleBeforeUnload = () => {
    if (!this.agentInstanceId || !this.agentPodStatus) {
      return;
    }
    const namespace = this.props.namespace;
    const agentId = encodeURIComponent(this.agentInstanceId);
    fetch(`/dashboard/api/namespace/${namespace}/agent/${agentId}`, {
      method: 'DELETE',
      keepalive: true,
    });
  };

  private findTargetWorkspace(props: Props): Workspace | undefined {
    const loaderMode = getLoaderMode(props.location);
    if (loaderMode.mode !== 'workspace') {
      return;
    }
    return findTargetWorkspace(props.allWorkspaces, loaderMode.workspaceParams);
  }

  private handleTabChange(tab: LoaderTab): void {
    this.setState({
      tabParam: tab,
    });

    const { location } = this.props;
    const searchParams = new URLSearchParams(
      decodeURIComponent(location.search).replaceAll('?', '&'),
    );
    searchParams.set('tab', LoaderTab[tab]);
    location.search = searchParams.toString();
    this.props.navigate(location);
  }

  render(): React.ReactElement {
    const { location, navigate, isDarkTheme, agentTerminalUrl, agentEnabled, defaultAgent } =
      this.props;
    const { tabParam, searchParams } = this.state;

    const workspace = this.findTargetWorkspace(this.props);
    const workspaceContent = workspace ? dump(workspace.ref, { lineWidth: -1 }) : '';

    return (
      <LoaderPage
        location={location}
        navigate={navigate}
        searchParams={searchParams}
        tabParam={tabParam}
        workspace={workspace}
        workspaceContent={workspaceContent}
        onTabChange={tab => this.handleTabChange(tab)}
        agentPodStatus={this.agentPodStatus}
        agentTerminalUrl={agentTerminalUrl}
        agentEnabled={agentEnabled}
        agentInitCommand={defaultAgent?.initCommand}
        agentInstanceId={this.agentInstanceId}
        agentName={defaultAgent?.name}
        agentDescription={defaultAgent?.description}
        isDarkTheme={isDarkTheme}
        onStartAgent={this.handleStartAgent}
        onStopAgent={this.handleStopAgent}
      />
    );
  }
}

function ContainerWrapper(props: MappedProps) {
  const params = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const { isDarkTheme } = useTheme();

  return (
    <LoaderContainer
      {...props}
      location={location}
      navigate={navigate}
      routeParams={params}
      isDarkTheme={isDarkTheme}
    />
  );
}

const mapStateToProps = (state: RootState) => ({
  allWorkspaces: selectAllWorkspaces(state),
  namespace: selectDefaultNamespace(state).name,
  agentPodStatuses: selectAgentPodStatuses(state),
  agentTerminalUrl: selectAgentTerminalUrl(state),
  agentEnabled: selectAiAgentRegistryEnabled(state),
  defaultAgent: selectDefaultAgent(state),
});

const mapDispatchToProps = {
  startAgent: actionCreators.startAgent,
  stopAgent: actionCreators.stopAgent,
  fetchAgentTerminalUrl: actionCreators.fetchAgentTerminalUrl,
  sendHeartbeat: actionCreators.sendHeartbeat,
  clearAgentTerminalUrl,
};

const connector = connect(mapStateToProps, mapDispatchToProps, null, {
  forwardRef: true,
});
type MappedProps = ConnectedProps<typeof connector>;
export default connector(ContainerWrapper);
