# Copyright (c) 2018-2025 Red Hat, Inc.
# This program and the accompanying materials are made
# available under the terms of the Eclipse Public License 2.0
# which is available at https://www.eclipse.org/legal/epl-2.0/
#
# SPDX-License-Identifier: EPL-2.0
#
# Contributors:
#   Red Hat, Inc. - initial API and implementation

# Run the build stage on the host platform so that yarn install and yarn build
# always execute natively (no QEMU).  The build output is pure JavaScript, so
# copying it into the target-platform final image works for any architecture.
FROM --platform=$BUILDPLATFORM docker.io/node:24.0.2-alpine3.21 AS builder

# hadolint ignore=DL3018
RUN apk add --no-cache python3 py3-pip make g++ jq curl git zip bash
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

ENV PLUGINS=packages/dashboard-plugins
COPY ${PLUGINS}/package.json /dashboard/${PLUGINS}/

WORKDIR /dashboard

ENV DISABLE_OPENCOLLECTIVE=true
ENV ADBLOCK=true

RUN yarn install --network-timeout 3600000 --frozen-lockfile --mode=skip-build || \
    yarn install --network-timeout 3600000 --frozen-lockfile
COPY packages/ /dashboard/packages
COPY scripts/prepare-plugins.sh /dashboard/scripts/prepare-plugins.sh
COPY scripts/fetch-plugins.sh   /dashboard/scripts/fetch-plugins.sh
ARG PLUGINS_REPO=olexii4/che-dashboard-plugins
ARG PLUGINS_REF=latest
RUN bash scripts/fetch-plugins.sh \
    && find packages/dashboard-frontend/src/plugins packages/dashboard-backend/src/plugins -maxdepth 1 -type l -delete 2>/dev/null || true \
    && rm -f packages/dashboard-frontend/src/plugins/index.ts \
    && for d in plugins/*/; do \
         [ -f "$d/plugin.json" ] || continue; \
         name=$(basename "$d"); \
         [ -d "$d/frontend" ] && cp -r "$d/frontend" "packages/dashboard-frontend/src/plugins/$name"; \
         [ -d "$d/backend" ] && cp -r "$d/backend" "packages/dashboard-backend/src/plugins/$name"; \
       done \
    && bash scripts/prepare-plugins.sh
RUN yarn workspace @eclipse-che/common run build \
    && yarn workspace @eclipse-che/dashboard-plugins run build \
    && yarn workspace @eclipse-che/dashboard-backend run build \
    && yarn workspace @eclipse-che/dashboard-frontend run build

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
