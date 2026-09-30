#!/bin/bash
#
# Copyright (c) 2012-2024 Red Hat, Inc.
# This program and the accompanying materials are made
# available under the terms of the Eclipse Public License 2.0
# which is available at https://www.eclipse.org/legal/epl-2.0/
#
# SPDX-License-Identifier: EPL-2.0
#
# Note: if we used a UBI image we could keep this current with
# https://github.com/eclipse-che/che-release/blob/main/.github/workflows/update-base-images.yml
FROM registry.ci.openshift.org/openshift/release:golang-1.20

SHELL ["/bin/bash", "-c"]

# Temporary workaround since mirror.centos.org is down and can be replaced with vault.centos.org
RUN sed -i s/mirror.centos.org/vault.centos.org/g /etc/yum.repos.d/*.repo && \
    sed -i s/^#.*baseurl=http/baseurl=http/g /etc/yum.repos.d/*.repo && \
    sed -i s/^mirrorlist=http/#mirrorlist=http/g /etc/yum.repos.d/*.repo


# chectl tarballs ship no bundled node and fall back to the node found on PATH.
# Since @kubernetes/client-node 1.x is ESM only, chectl needs a node that supports
# require() of an ES module, i.e. >= 22.12 (chectl declares engines.node >= 22.13).
# The nodejs package from the base image repositories is 16.x and makes
# `chectl server:deploy` fail with ERR_REQUIRE_ESM.
#
# The base image is still el7 (glibc 2.17), so the node.org binaries, which need
# glibc 2.28, cannot be used here - take the glibc-217 build instead.
ARG NODE_VERSION=22.23.3
ARG NODE_TARBALL=node-v${NODE_VERSION}-linux-x64-glibc-217.tar.gz

# Install yq, node, kubectl, chectl cli.
RUN yum install --assumeyes -d1 python3-pip  httpd-tools && \
    pip3 install --upgrade setuptools && \
    pip3 install yq && \
    mkdir -p /usr/local/lib/nodejs && \
    curl -sL https://unofficial-builds.nodejs.org/download/release/v${NODE_VERSION}/${NODE_TARBALL} | \
      tar -xz -C /usr/local/lib/nodejs --strip-components=1 --no-same-owner && \
    ln -s /usr/local/lib/nodejs/bin/node /usr/local/bin/node && \
    ln -s /usr/local/lib/nodejs/bin/npm /usr/local/bin/npm && \
    ln -s /usr/local/lib/nodejs/bin/npx /usr/local/bin/npx && \
    node --version && \
    curl -LO https://storage.googleapis.com/kubernetes-release/release/$(curl -s https://storage.googleapis.com/kubernetes-release/release/stable.txt)/bin/linux/amd64/kubectl && \
    chmod +x ./kubectl && \
    mv ./kubectl /usr/local/bin && \
    bash <(curl -sL https://che-incubator.github.io/chectl/install.sh) --channel=next && \
    chectl --version
