# Copyright (c) 2018-2025 Red Hat, Inc.
# This program and the accompanying materials are made
# available under the terms of the Eclipse Public License 2.0
# which is available at https://www.eclipse.org/legal/epl-2.0/
#
# SPDX-License-Identifier: EPL-2.0
#
# Contributors:
#   Red Hat, Inc. - initial API and implementation

# https://registry.access.redhat.com/ubi9/nodejs-20
FROM registry.access.redhat.com/ubi9/nodejs-20 as builder
# hadolint ignore=DL3002
USER 0
RUN dnf -y -q update --exclude=unbound-libs 

COPY . /dashboard/
WORKDIR /dashboard/
RUN npm i -g yarn \
    && find packages/dashboard-frontend/src/plugins packages/dashboard-backend/src/plugins -maxdepth 1 -type l -delete \
    && rm -f packages/dashboard-frontend/src/plugins/index.ts \
    && for d in plugins/*/; do \
         [ -f "$d/plugin.json" ] || continue; \
         name=$(basename "$d"); \
         [ -d "$d/frontend" ] && cp -r "$d/frontend" "packages/dashboard-frontend/src/plugins/$name"; \
         [ -d "$d/backend" ] && cp -r "$d/backend" "packages/dashboard-backend/src/plugins/$name"; \
       done \
    && bash scripts/prepare-plugins.sh \
    && yarn install
RUN yarn workspace @eclipse-che/common run build \
    && yarn workspace @eclipse-che/dashboard-plugins run build \
    && yarn workspace @eclipse-che/dashboard-backend run build \
    && yarn workspace @eclipse-che/dashboard-frontend run build

# https://registry.access.redhat.com/ubi9/nodejs-20
FROM registry.access.redhat.com/ubi9/nodejs-20
# hadolint ignore=DL3002
USER 0
# hadolint ignore=DL4006
RUN \
    dnf -y -q update && \
    dnf -y -q install git && \
    dnf -y -q clean all && rm -rf /var/cache/dnf && \
    echo "Installed Packages" && rpm -qa | sort -V && echo "End Of Installed Packages"

ENV FRONTEND_LIB=/dashboard/packages/dashboard-frontend/lib/public
ENV BACKEND_LIB=/dashboard/packages/dashboard-backend/lib
ENV DEVFILE_REGISTRY=/dashboard/packages/devfile-registry

COPY --from=builder ${BACKEND_LIB} /backend
COPY --from=builder ${FRONTEND_LIB} /public
COPY --from=builder ${DEVFILE_REGISTRY} /public/dashboard/devfile-registry

RUN chmod -R ug+rw /public/dashboard/devfile-registry

COPY build/dockerfiles/rhel.entrypoint.sh /usr/local/bin
CMD ["/usr/local/bin/rhel.entrypoint.sh"]

## Append Brew metadata
