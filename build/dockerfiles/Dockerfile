# Copyright (c) 2018-2025 Red Hat, Inc.
# This program and the accompanying materials are made
# available under the terms of the Eclipse Public License 2.0
# which is available at https://www.eclipse.org/legal/epl-2.0/
#
# SPDX-License-Identifier: EPL-2.0
#
# Contributors:
#   Red Hat, Inc. - initial API and implementation

FROM docker.io/node:24.0.2-alpine3.21 AS builder

# Platform detection for multi-arch builds
ARG TARGETARCH
ARG TARGETPLATFORM

# hadolint ignore=DL3018
RUN apk add --no-cache python3 py3-pip make g++ jq curl git zip
RUN pip3 install yq --break-system-packages

COPY .yarn/releases /dashboard/.yarn/releases/
COPY .yarnrc.yml /dashboard/.yarnrc.yml
COPY package.json /dashboard/
COPY yarn.lock /dashboard/
COPY tsconfig.json /dashboard/

ENV COMMON=packages/common
COPY ${COMMON}/package.json /dashboard/${COMMON}/

ENV FRONTEND=packages/dashboard-frontend
COPY ${FRONTEND}/package.json /dashboard/${FRONTEND}/

ENV BACKEND=packages/dashboard-backend
COPY ${BACKEND}/package.json /dashboard/${BACKEND}/

WORKDIR /dashboard

# Set environment variables for better ARM64 compatibility
# Reduce memory usage and disable problematic V8 optimizations
ENV NODE_OPTIONS="--max-old-space-size=3072"
ENV DISABLE_OPENCOLLECTIVE=true
ENV ADBLOCK=true

# Install dependencies with increased timeout and frozen lockfile
# Use --ignore-scripts initially to avoid native module compilation issues
RUN yarn install --network-timeout 3600000 --frozen-lockfile --mode=skip-build || \
    yarn install --network-timeout 3600000 --frozen-lockfile
COPY packages/ /dashboard/packages
RUN yarn build

# Prepare air-gapped resources
COPY scripts/airgap.sh /dashboard/airgap.sh
RUN /dashboard/airgap.sh -i /dashboard/packages/devfile-registry/air-gap/index.json

FROM docker.io/node:24.0.2-alpine3.21

RUN apk --no-cache add curl git

ENV FRONTEND_LIB=/dashboard/packages/dashboard-frontend/lib/public
ENV BACKEND_LIB=/dashboard/packages/dashboard-backend/lib
ENV DEVFILE_REGISTRY=/dashboard/packages/devfile-registry

COPY --from=builder ${BACKEND_LIB} /backend
COPY --from=builder ${FRONTEND_LIB} /public
COPY --from=builder ${DEVFILE_REGISTRY} /public/dashboard/devfile-registry

RUN chmod -R ug+rw /public/dashboard/devfile-registry

COPY build/dockerfiles/entrypoint.sh /entrypoint.sh

EXPOSE 80
EXPOSE 443

ENTRYPOINT [ "/entrypoint.sh" ]
CMD [ "sh" ]
