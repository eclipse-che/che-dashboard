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

import {
  Badge,
  Brand,
  Button,
  ButtonVariant,
  Card,
  CardBody,
  CardFooter,
  CardHeader,
  CardTitle,
  Content,
  EmptyState,
  EmptyStateBody,
  Flex,
  FlexItem,
  Gallery,
  PageSection,
  Panel,
  PanelHeader,
  PanelMain,
  PanelMainBody,
  Spinner,
  Switch,
  Title,
  Tooltip,
} from '@patternfly/react-core';
import { CodeIcon, CubesIcon, OutlinedQuestionCircleIcon } from '@patternfly/react-icons';
import React from 'react';
import { useNavigate } from 'react-router-dom';

import { AiProviderSelector } from '@/components/AiProviderSelector';
import { buildManageKeysUrl } from '@/components/AiToolSelector/manageKeys';
import { ErrorAlert } from '@/components/ErrorAlert';
import { SampleManifestModal } from '@/components/SampleManifestModal';
import { TemporaryStorageSwitch } from '@/components/TemporaryStorageSwitch';
import styles from '@/pages/GettingStarted/index.module.css';
import { buildSandboxDetailsRoute, SANDBOX_TAB } from '@/Routes';
import { pageTitle, SECTION } from '@/services/pageTitle';
import { resolveSampleIcon, SandboxSample } from '@/services/samples';
import {
  generateRandomSuffix,
  NO_CUSTOMIZATION,
  SandboxCustomization,
  sanitizeKubernetesName,
} from '@/services/sandboxFactory';
import { DEFAULT_STORAGE_TYPE, SandboxStorageType } from '@/services/sandboxStorage';
import { selectDashboardUrl, selectNamespace, selectSamplesIndexUrl } from '@/store/Bootstrap';
import { selectAiProviders, selectAiTools, selectDefaultAiProviders } from '@/store/Catalog';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import {
  samplesActionCreators,
  selectSampleCreateError,
  selectSampleCreatePendingId,
  selectSampleManifestContent,
  selectSampleManifestError,
  selectSampleManifestId,
  selectSampleManifestIsLoading,
  selectSamples,
  selectSamplesError,
  selectSamplesIsLoading,
} from '@/store/Samples';

/**
 * Getting Started gallery, backed by the manifests that
 * `scripts/prepare-samples.sh` downloads from kubernetes-sigs/agent-sandbox.
 *
 * Creating from a card applies the upstream manifest as-is into the user's
 * namespace; anything that needs customising goes through the wizard instead.
 */
export function GettingStarted(): React.ReactElement {
  const navigate = useNavigate();
  const dispatch = useAppDispatch();

  const namespace = useAppSelector(selectNamespace);
  const indexUrl = useAppSelector(selectSamplesIndexUrl);
  const samples = useAppSelector(selectSamples);
  const isLoading = useAppSelector(selectSamplesIsLoading);
  const loadError = useAppSelector(selectSamplesError);
  const createError = useAppSelector(selectSampleCreateError);
  const pendingId = useAppSelector(selectSampleCreatePendingId);
  const manifestId = useAppSelector(selectSampleManifestId);
  const manifestContent = useAppSelector(selectSampleManifestContent);
  const manifestError = useAppSelector(selectSampleManifestError);
  const manifestIsLoading = useAppSelector(selectSampleManifestIsLoading);
  const dashboardUrl = useAppSelector(selectDashboardUrl);
  const aiTools = useAppSelector(selectAiTools);
  const aiProviders = useAppSelector(selectAiProviders);
  const defaultProviderIds = useAppSelector(selectDefaultAiProviders);

  const [customization, setCustomization] = React.useState<SandboxCustomization>(NO_CUSTOMIZATION);
  const [storageType, setStorageType] = React.useState<SandboxStorageType>(DEFAULT_STORAGE_TYPE);
  const [createNewEnabled, setCreateNewEnabled] = React.useState(false);

  React.useEffect(() => {
    void dispatch(samplesActionCreators.requestSamples());
  }, [dispatch]);

  const handleCreate = React.useCallback(
    async (sample: SandboxSample) => {
      // If "Create New" is enabled, add a random suffix to ensure uniqueness; otherwise, use the sample name as-is
      const name = createNewEnabled
        ? sanitizeKubernetesName(`${sample.displayName}-${generateRandomSuffix()}`)
        : undefined;

      const created = await dispatch(
        samplesActionCreators.createSandboxFromSample(sample, customization, storageType, name),
      );
      if (created !== undefined) {
        // Events are what there is to watch on a sandbox that has just been
        // asked for, so the details page opens on them rather than on Overview.
        navigate(buildSandboxDetailsRoute(created.metadata.name, SANDBOX_TAB.EVENTS));
      }
    },
    [createNewEnabled, customization, dispatch, navigate, storageType],
  );

  // A clickable card is not a button, so Enter and Space have to be wired up.
  const handleCardKeyDown = React.useCallback(
    (event: React.KeyboardEvent, sample: SandboxSample) => {
      if (event.key !== 'Enter' && event.key !== ' ') {
        return;
      }
      event.preventDefault();
      void handleCreate(sample);
    },
    [handleCreate],
  );

  const handleCreateNewChange = React.useCallback((_event: React.FormEvent, checked: boolean) => {
    setCreateNewEnabled(checked);
  }, []);

  if (isLoading) {
    return (
      <PageSection>
        <EmptyState icon={Spinner} titleText="Loading samples" />
      </PageSection>
    );
  }

  return (
    <PageSection>
      <Title headingLevel="h1" size="2xl">
        {pageTitle(SECTION.GETTING_STARTED)}
      </Title>
      <Content component="p">
        Create an Agent Space from the example below. The card applies the manifest as published by
        the agent-sandbox project into <strong>{namespace}</strong>, with the AI tools chosen below.
      </Content>

      <ErrorAlert title="Could not load the samples" error={loadError} />
      <ErrorAlert
        title="Could not create the sandbox"
        error={createError}
        onClose={() => dispatch(samplesActionCreators.clearSampleCreateError())}
      />

      {/* The dashboard's create-workspace selector, copied for this page; the
          wizard and the details page keep the compact pencil one. Renders
          nothing when the cluster publishes no AI tools. */}
      <AiProviderSelector
        aiTools={aiTools}
        aiProviders={aiProviders}
        defaultProviderIds={defaultProviderIds}
        manageKeysUrl={buildManageKeysUrl(dashboardUrl)}
        isDisabled={pendingId !== undefined}
        onChange={setCustomization}
      />

      {/* The dashboard draws the same border with an `overrides.css` rule that
          Agent Space does not load; `bordered` is the PatternFly equivalent. */}
      <Panel variant="bordered">
        <PanelHeader>
          <Flex alignItems={{ default: 'alignItemsCenter' }}>
            <FlexItem>
              <Title headingLevel="h3">Select a Sample</Title>
              <Content>
                <Content component="small">
                  Select a sample to create your first Agent Space.
                </Content>
              </Content>
            </FlexItem>
            {/* The storage of a sample is decided before the card is clicked,
                because the click is the whole of the create. */}
            <FlexItem align={{ default: 'alignRight' }}>
              <Flex gap={{ default: 'gapLg' }}>
                <FlexItem>
                  <div
                    style={{ display: 'contents' }}
                    onKeyDown={(event: React.KeyboardEvent) => {
                      if ((event.key === 'Enter' || event.key === ' ') && !createNewEnabled) {
                        event.preventDefault();
                        handleCreateNewChange(event as unknown as React.FormEvent, true);
                      }
                    }}
                  >
                    <Switch
                      id="create-new-switch"
                      data-testid="create-new-switch"
                      isChecked={createNewEnabled}
                      onChange={handleCreateNewChange}
                      label={
                        <div style={{ minWidth: '125px' }}>
                          Create New
                          <Tooltip
                            exitDelay={1500}
                            content="Create a new agent each time when ON; reuse an existing one when OFF."
                          >
                            <OutlinedQuestionCircleIcon
                              style={{ marginLeft: '0.5rem' }}
                              data-testid="create-new-info"
                            />
                          </Tooltip>
                        </div>
                      }
                    />
                  </div>
                </FlexItem>
                <FlexItem>
                  <TemporaryStorageSwitch
                    isTemporary={storageType === 'ephemeral'}
                    isDisabled={pendingId !== undefined}
                    onChange={isTemporary =>
                      setStorageType(isTemporary ? 'ephemeral' : 'per-sandbox')
                    }
                  />
                </FlexItem>
              </Flex>
            </FlexItem>
          </Flex>
        </PanelHeader>
        <PanelMain>
          <PanelMainBody>
            {samples.length === 0 && loadError === undefined ? (
              <EmptyState icon={CubesIcon} titleText="No samples available">
                <EmptyStateBody>
                  Run <code>yarn samples:prepare</code> to download the Getting Started manifests,
                  or create a sandbox with the wizard.
                </EmptyStateBody>
              </EmptyState>
            ) : (
              <Gallery style={{ minHeight: '275px' }} hasGutter>
                {samples.map(sample => {
                  const cardId = `sample-card-${sample.id}`;
                  const isPending = pendingId === sample.id;
                  const iconSrc = resolveSampleIcon(indexUrl, sample);

                  return (
                    <Card
                      key={sample.id}
                      id={cardId}
                      isCompact
                      isClickable
                      isDisabled={pendingId !== undefined}
                      onClick={() => void handleCreate(sample)}
                      onKeyDown={event => handleCardKeyDown(event, sample)}
                      tabIndex={0}
                      aria-label={`Create an Agent Space from the ${sample.displayName} sample`}
                      className={styles.sampleCard}
                      data-testid={`sample-${sample.id}`}
                    >
                      {/* PF6 wants the selectable action on a clickable card; the
                          hidden input carries the semantics, the card the label. */}
                      <CardHeader
                        selectableActions={{
                          selectableActionAriaLabelledby: cardId,
                          name: 'sample-cards',
                          isHidden: true,
                        }}
                      >
                        {iconSrc ? (
                          <Brand
                            src={iconSrc}
                            className={styles.sampleCardIcon}
                            alt={sample.displayName}
                            aria-label={sample.displayName}
                            data-testid={`sample-icon-${sample.id}`}
                          />
                        ) : (
                          <CubesIcon
                            className={styles.sampleCardIcon}
                            aria-label={sample.displayName}
                            data-testid={`default-icon-${sample.id}`}
                          />
                        )}
                        <CardTitle>
                          {sample.displayName}
                          {sample.tags.length > 0 && (
                            <span className={styles.tagGroup}>
                              {sample.tags.map(tag => (
                                <Badge key={tag} isRead style={{ whiteSpace: 'nowrap' }}>
                                  {tag}
                                </Badge>
                              ))}
                            </span>
                          )}
                        </CardTitle>
                      </CardHeader>
                      <CardBody>
                        {sample.description}
                        {sample.notes && (
                          <Content component="small">
                            <strong>Note:</strong> {sample.notes}
                          </Content>
                        )}
                      </CardBody>
                      <CardFooter>
                        <Flex alignItems={{ default: 'alignItemsCenter' }}>
                          <FlexItem>
                            <Button
                              variant={ButtonVariant.link}
                              isInline
                              icon={<CodeIcon />}
                              // The card creates a sandbox when clicked; reading
                              // the manifest first must not create one.
                              onClick={event => {
                                event.stopPropagation();
                                void dispatch(samplesActionCreators.showSampleManifest(sample));
                              }}
                              data-testid={`view-manifest-${sample.id}`}
                            >
                              View manifest
                            </Button>
                          </FlexItem>
                          {isPending && (
                            <FlexItem>
                              <Spinner size="sm" aria-label="Creating the sandbox" />
                            </FlexItem>
                          )}
                        </Flex>
                      </CardFooter>
                    </Card>
                  );
                })}
              </Gallery>
            )}
          </PanelMainBody>
        </PanelMain>
      </Panel>

      <SampleManifestModal
        isOpen={manifestId !== undefined}
        sampleName={samples.find(sample => sample.id === manifestId)?.displayName ?? ''}
        content={manifestContent}
        isLoading={manifestIsLoading}
        error={manifestError}
        onClose={() => dispatch(samplesActionCreators.closeSampleManifest())}
      />
    </PageSection>
  );
}
