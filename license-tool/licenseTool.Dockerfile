# Copyright (c) 2020     Red Hat, Inc.
# This program and the accompanying materials are made
# available under the terms of the Eclipse Public License 2.0
# which is available at https://www.eclipse.org/legal/epl-2.0/
#
# SPDX-License-Identifier: EPL-2.0
#
# Contributors:
#   Red Hat, Inc. - initial API and implementation

FROM docker.io/openjdk:15-jdk

RUN microdnf install -y git

ARG MAVEN_VERSION=3.6.3
ARG BASE_URL=https://apache.osuosl.org/maven/maven-3/${MAVEN_VERSION}/binaries
# https://github.com/eclipse/dash-licenses/commits Jan 25, 2021
ARG DASH_LICENSE_REV=88b29e82ba9d4b83f86e3842fc942e2513666534

RUN mkdir -p /usr/local/apache-maven /usr/local/apache-maven/ref \
  && curl -fsSL -o /tmp/apache-maven.tar.gz ${BASE_URL}/apache-maven-${MAVEN_VERSION}-bin.tar.gz \
  && tar -xzf /tmp/apache-maven.tar.gz -C /usr/local/apache-maven --strip-components=1 \
  && rm -f /tmp/apache-maven.tar.gz \
  && ln -s /usr/local/apache-maven/bin/mvn /usr/bin/mvn

ENV NODE_VERSION=v12.20.1
ENV NODE_DISTRO=linux-x64
ENV NODE_BASE_URL=https://nodejs.org/dist/latest-v12.x

RUN curl -fsSL ${NODE_BASE_URL}/node-${NODE_VERSION}-${NODE_DISTRO}.tar.gz -o node-${NODE_VERSION}-${NODE_DISTRO}.tar.gz \
  && mkdir -p /usr/local/lib/nodejs \
  && tar -xzf node-${NODE_VERSION}-${NODE_DISTRO}.tar.gz -C /usr/local/lib/nodejs \
  && rm node-${NODE_VERSION}-${NODE_DISTRO}.tar.gz

ENV PATH=/usr/local/lib/nodejs/node-${NODE_VERSION}-${NODE_DISTRO}/bin/:$PATH

RUN npm install yarn -g

RUN mkdir /workspace && cd /workspace && \
    git clone https://github.com/eclipse/dash-licenses.git && \
    cd /workspace/dash-licenses && git checkout ${DASH_LICENT_REV} && \
    mvn clean install && \
    cd ./yarn && yarn install

WORKDIR /workspace/

ADD ${PWD}/license-tool/src/entrypoint.sh /workspace/entrypoint.sh
ADD ${PWD}/license-tool/src/bump-deps.js /workspace/bump-deps.js

ENTRYPOINT ["/workspace/entrypoint.sh"]
