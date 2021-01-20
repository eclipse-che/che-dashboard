# Copyright (c) 2020     Red Hat, Inc.
# This program and the accompanying materials are made
# available under the terms of the Eclipse Public License 2.0
# which is available at https://www.eclipse.org/legal/epl-2.0/
#
# SPDX-License-Identifier: EPL-2.0
#
# Contributors:
#   Red Hat, Inc. - initial API and implementation

ARG CHE_DASHBOARD_IMAGE=quay.io/eclipse/che-dashboard
ARG CHE_DASHBOARD_VERSION=next

FROM docker.io/node:12 as builder

COPY package.json /dashboard/
COPY yarn.lock /dashboard/
WORKDIR /dashboard
RUN yarn --network-timeout 600000 && yarn install --ignore-optional
COPY . /dashboard/
RUN yarn compile

FROM ${CHE_DASHBOARD_IMAGE}:${CHE_DASHBOARD_VERSION}
RUN mkdir -p /usr/local/apache2/htdocs/dashboard/next
COPY --from=builder /dashboard/build /usr/local/apache2/htdocs/dashboard/next
