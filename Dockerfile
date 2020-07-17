# Copyright (c) 2015-2018 Red Hat, Inc.
# This program and the accompanying materials are made
# available under the terms of the Eclipse Public License 2.0
# which is available at https://www.eclipse.org/legal/epl-2.0/
#
# SPDX-License-Identifier: EPL-2.0
#
# Contributors:
#   Red Hat, Inc. - initial API and implementation

# This is a Dockerfile allowing to build dashboard by using a docker container.
# Build step: $ docker build -t eclipse-che-dashboard .
# It builds an archive file that can be used by doing later
#  $ docker run --rm eclipse-che-dashboard | tar -C target/ -zxf -

FROM node:8.16.0

RUN apt-get update \
    && apt-get install -y git curl \
    && if [ "$(uname -m)" = "s390x" ]; then apt-get install -y phantomjs; fi \
    && apt-get -y clean \
    && rm -rf /var/lib/apt/lists/*

RUN if [ "$(uname -m)" = "ppc64le" ]; then \
     mkdir /tmp/phantomjs \
     && curl -Ls "https://github.com/ibmsoe/phantomjs/releases/download/2.1.1/phantomjs-2.1.1-linux-ppc64.tar.bz2" | tar -xj --strip-components=1 -C /tmp/phantomjs \
     && cd /tmp/phantomjs \
     && mv bin/phantomjs /usr/local/bin \
     && rm -rf /tmp/phantomjs; fi

COPY package.json /dashboard/
COPY yarn.lock /dashboard/
WORKDIR /dashboard
RUN if [ "$(uname -m)" = "s390x" ]; then export QT_QPA_PLATFORM=offscreen; fi \
    && yarn install --ignore-optional

COPY . /dashboard/

RUN if [ "$(uname -m)" = "ppc64le" ] || [ "$(uname -m)" = "s390x" ]; then yarn build; else \
    yarn build && yarn test; fi
RUN cd /dashboard/target/ && tar zcf /tmp/dashboard.tar.gz dist/

CMD zcat /tmp/dashboard.tar.gz
