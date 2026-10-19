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
  Button,
  ButtonVariant,
  CodeBlock,
  CodeBlockCode,
  Content,
  Form,
  FormGroup,
  FormGroupLabelHelp,
  FormHelperText,
  FormSelect,
  FormSelectOption,
  Grid,
  GridItem,
  HelperText,
  HelperTextItem,
  PageSection,
  TextInput,
  Title,
} from '@patternfly/react-core';
import { dump } from 'js-yaml';
import React from 'react';
import { useNavigate } from 'react-router-dom';

import { AiToolDropdown } from '@/components/AiToolSelector/Dropdown';
import { ErrorAlert } from '@/components/ErrorAlert';
import { StorageTypeInfoModal } from '@/components/StorageTypeSelector/InfoModal';
import { buildSandboxDetailsRoute, ROUTE, SANDBOX_TAB } from '@/Routes';
import { pageTitle, SECTION } from '@/services/pageTitle';
import {
  buildSandbox,
  DEFAULT_FORM_DATA,
  KEEP_ALIVE_COMMAND,
  SandboxCustomization,
  SandboxFormData,
  SUGGESTED_RUNTIME_CLASSES,
  validateForm,
  withOriginalManifest,
} from '@/services/sandboxFactory';
import {
  DEFAULT_STORAGE_TYPE,
  STORAGE_TYPE_DESCRIPTIONS,
  STORAGE_TYPE_TITLES,
  STORAGE_TYPES,
} from '@/services/sandboxStorage';
import { selectDashboardUrl, selectNamespace } from '@/store/Bootstrap';
import { selectAiProviders, selectAiTools } from '@/store/Catalog';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import {
  sandboxesActionCreators,
  selectSandboxActionError,
  selectSandboxActionPendingName,
} from '@/store/Sandboxes';

const RUNTIME_CLASS_OPTIONS = ['', ...SUGGESTED_RUNTIME_CLASSES];

/**
 * Create wizard for the MVP: name, image, runtime class and resource limits,
 * with a live preview of the manifest that will be submitted.
 *
 * The preview is not decoration - the generated Sandbox is the contract with
 * the cluster, and seeing it is how a user spots a wrong runtime class before
 * the pod fails to schedule.
 */
export function CreateSandbox(): React.ReactElement {
  const navigate = useNavigate();
  const dispatch = useAppDispatch();

  const namespace = useAppSelector(selectNamespace);
  const dashboardUrl = useAppSelector(selectDashboardUrl);
  const error = useAppSelector(selectSandboxActionError);
  const isSubmitting = useAppSelector(selectSandboxActionPendingName) !== undefined;

  const aiProviders = useAppSelector(selectAiProviders);
  const aiTools = useAppSelector(selectAiTools);

  const [data, setData] = React.useState<SandboxFormData>(DEFAULT_FORM_DATA);
  const [touched, setTouched] = React.useState<Partial<Record<keyof SandboxFormData, boolean>>>({});
  const [isStorageInfoOpen, setIsStorageInfoOpen] = React.useState(false);

  const errors = React.useMemo(() => validateForm(data), [data]);
  const isValid = Object.keys(errors).length === 0;

  const preview = React.useMemo(() => {
    try {
      return dump(buildSandbox(data, namespace, aiTools), { lineWidth: 100 });
    } catch {
      return '';
    }
  }, [aiTools, data, namespace]);

  const update = React.useCallback((field: keyof SandboxFormData, value: string) => {
    setData(prev => ({ ...prev, [field]: value }));
    setTouched(prev => ({ ...prev, [field]: true }));
  }, []);

  const errorOf = (field: keyof SandboxFormData): string | undefined =>
    touched[field] ? errors[field] : undefined;

  const handleCustomizationChange = React.useCallback(
    ({ aiProviderIds, aiVersions }: SandboxCustomization) => {
      setData(prev => ({ ...prev, aiProviderIds, aiVersions: aiVersions ?? {} }));
    },
    [],
  );

  // The select hands back a plain string; looking it up rather than asserting
  // keeps a value the form never offered out of the manifest.
  const handleStorageTypeChange = React.useCallback((value: string) => {
    const storageType = STORAGE_TYPES.find(type => type === value) ?? DEFAULT_STORAGE_TYPE;
    setData(prev => ({ ...prev, storageType }));
  }, []);

  const handleSubmit = React.useCallback(async () => {
    const sandbox = buildSandbox(data, namespace, aiTools);
    // What the preview showed is what the Manifest tab keeps, so the two agree.
    const created = await dispatch(
      sandboxesActionCreators.createSandbox(
        withOriginalManifest(sandbox, dump(sandbox, { lineWidth: 100 })),
      ),
    );
    if (created !== undefined) {
      // Same as the sample gallery: a sandbox that was just asked for is worth
      // watching, and the Events tab is where that shows.
      navigate(buildSandboxDetailsRoute(created.metadata.name, SANDBOX_TAB.EVENTS));
    }
  }, [aiTools, data, dispatch, namespace, navigate]);

  return (
    <PageSection>
      <Title headingLevel="h1" size="2xl">
        {pageTitle(SECTION.CREATE)}
      </Title>
      <Content component="p">
        The sandbox is created in <strong>{namespace}</strong>.
      </Content>

      <ErrorAlert
        title="Could not create the sandbox"
        error={error}
        onClose={() => dispatch(sandboxesActionCreators.clearActionError())}
      />

      <Grid hasGutter style={{ marginTop: '1rem' }}>
        <GridItem lg={6} md={12}>
          <Form
            onSubmit={event => {
              event.preventDefault();
              if (isValid) {
                void handleSubmit();
              }
            }}
          >
            <FormGroup label="Name" isRequired fieldId="sandbox-name">
              <TextInput
                id="sandbox-name"
                data-testid="sandbox-name"
                isRequired
                value={data.name}
                validated={errorOf('name') ? 'error' : 'default'}
                onChange={(_event, value) => update('name', value)}
                placeholder="my-agent"
              />
              <FormHelperText>
                <HelperText>
                  <HelperTextItem variant={errorOf('name') ? 'error' : 'default'}>
                    {errorOf('name') ?? 'Lowercase letters, digits and dashes.'}
                  </HelperTextItem>
                </HelperText>
              </FormHelperText>
            </FormGroup>

            <FormGroup label="Container image" isRequired fieldId="sandbox-image">
              <TextInput
                id="sandbox-image"
                data-testid="sandbox-image"
                isRequired
                value={data.image}
                validated={errorOf('image') ? 'error' : 'default'}
                onChange={(_event, value) => update('image', value)}
              />
              <FormHelperText>
                <HelperText>
                  <HelperTextItem variant={errorOf('image') ? 'error' : 'default'}>
                    {errorOf('image') ?? 'Image the agent runs in.'}
                  </HelperTextItem>
                </HelperText>
              </FormHelperText>
            </FormGroup>

            <FormGroup label="Command" fieldId="sandbox-command">
              <TextInput
                id="sandbox-command"
                data-testid="sandbox-command"
                value={data.command}
                onChange={(_event, value) => update('command', value)}
                placeholder={KEEP_ALIVE_COMMAND}
              />
              <FormHelperText>
                <HelperText>
                  <HelperTextItem>
                    Run with <code>/bin/sh -c</code>. The sandbox finishes as soon as this command
                    returns, so keep it running. Leave empty to use the image entrypoint.
                  </HelperTextItem>
                </HelperText>
              </FormHelperText>
            </FormGroup>

            <FormGroup label="Runtime class" fieldId="sandbox-runtime-class">
              <FormSelect
                id="sandbox-runtime-class"
                data-testid="sandbox-runtime-class"
                value={data.runtimeClassName}
                onChange={(_event, value) => update('runtimeClassName', value)}
              >
                {RUNTIME_CLASS_OPTIONS.map(option => (
                  <FormSelectOption
                    key={option || 'cluster-default'}
                    value={option}
                    label={option || 'Cluster default'}
                  />
                ))}
              </FormSelect>
              <FormHelperText>
                <HelperText>
                  <HelperTextItem>
                    Isolation boundary for the sandbox pod. The class has to exist on the cluster.
                  </HelperTextItem>
                </HelperText>
              </FormHelperText>
            </FormGroup>

            <FormGroup label="CPU limit" fieldId="sandbox-cpu">
              <TextInput
                id="sandbox-cpu"
                data-testid="sandbox-cpu"
                value={data.cpuLimit}
                validated={errorOf('cpuLimit') ? 'error' : 'default'}
                onChange={(_event, value) => update('cpuLimit', value)}
                placeholder="1"
              />
              <FormHelperText>
                <HelperText>
                  <HelperTextItem variant={errorOf('cpuLimit') ? 'error' : 'default'}>
                    {errorOf('cpuLimit') ?? "For example '2' or '500m'. Leave empty for no limit."}
                  </HelperTextItem>
                </HelperText>
              </FormHelperText>
            </FormGroup>

            <FormGroup label="Memory limit" fieldId="sandbox-memory">
              <TextInput
                id="sandbox-memory"
                data-testid="sandbox-memory"
                value={data.memoryLimit}
                validated={errorOf('memoryLimit') ? 'error' : 'default'}
                onChange={(_event, value) => update('memoryLimit', value)}
                placeholder="2Gi"
              />
              <FormHelperText>
                <HelperText>
                  <HelperTextItem variant={errorOf('memoryLimit') ? 'error' : 'default'}>
                    {errorOf('memoryLimit') ??
                      "For example '2Gi' or '512Mi'. Leave empty for no limit."}
                  </HelperTextItem>
                </HelperText>
              </FormHelperText>
            </FormGroup>

            <FormGroup label="AI tools" fieldId="sandbox-ai-tools">
              <AiToolDropdown
                aiTools={aiTools}
                aiProviders={aiProviders}
                dashboardUrl={dashboardUrl}
                customization={{
                  aiProviderIds: data.aiProviderIds,
                  aiVersions: data.aiVersions,
                }}
                isDisabled={isSubmitting}
                onChange={handleCustomizationChange}
              />
              <FormHelperText>
                <HelperText>
                  <HelperTextItem>
                    Each selected agent is installed into the sandbox by an init container. Its API
                    key is read from the namespace secret the dashboard stores it in, if there is
                    one.
                  </HelperTextItem>
                </HelperText>
              </FormHelperText>
            </FormGroup>

            <FormGroup
              label="Storage Type"
              fieldId="storage-type"
              labelHelp={
                <FormGroupLabelHelp
                  aria-label="More info for storage type"
                  data-testid="storage-type-info-toggle"
                  onClick={() => setIsStorageInfoOpen(true)}
                />
              }
            >
              <FormSelect
                id="storage-type"
                data-testid="storage-type"
                value={data.storageType}
                isDisabled={isSubmitting}
                onChange={(_event, value) => handleStorageTypeChange(value)}
              >
                {STORAGE_TYPES.map(storageType => (
                  <FormSelectOption
                    key={storageType}
                    value={storageType}
                    label={STORAGE_TYPE_TITLES[storageType]}
                  />
                ))}
              </FormSelect>
              <FormHelperText>
                <HelperText>
                  <HelperTextItem>{STORAGE_TYPE_DESCRIPTIONS[data.storageType]}</HelperTextItem>
                </HelperText>
              </FormHelperText>
              <StorageTypeInfoModal
                isOpen={isStorageInfoOpen}
                onClose={() => setIsStorageInfoOpen(false)}
              />
            </FormGroup>

            <div>
              <Button
                type="submit"
                variant={ButtonVariant.primary}
                isDisabled={!isValid || isSubmitting}
                isLoading={isSubmitting}
                data-testid="submit-button"
              >
                Create
              </Button>{' '}
              <Button
                variant={ButtonVariant.link}
                onClick={() => navigate(ROUTE.SANDBOXES)}
                data-testid="cancel-button"
              >
                Cancel
              </Button>
            </div>
          </Form>
        </GridItem>

        <GridItem lg={6} md={12}>
          <Title headingLevel="h2" size="md">
            Manifest preview
          </Title>
          <CodeBlock>
            <CodeBlockCode data-testid="manifest-preview">{preview}</CodeBlockCode>
          </CodeBlock>
        </GridItem>
      </Grid>
    </PageSection>
  );
}
