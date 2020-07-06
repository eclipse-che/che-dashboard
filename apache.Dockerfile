# Copyright (c) 2020     Red Hat, Inc.
# This program and the accompanying materials are made
# available under the terms of the Eclipse Public License 2.0
# which is available at https://www.eclipse.org/legal/epl-2.0/
#
# SPDX-License-Identifier: EPL-2.0
#
# Contributors:
#   Red Hat, Inc. - initial API and implementation

FROM docker.io/node:8.16.2 as builder


RUN apt-get update \
    && apt-get install -y git curl \
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
RUN yarn install --ignore-optional
COPY . /dashboard/

RUN if [ "$(uname -m)" = "ppc64le" ]; then yarn build; else \
    yarn build && yarn test; fi

FROM docker.io/httpd:2.4.43-alpine
RUN sed -i 's|    AllowOverride None|    AllowOverride All|' /usr/local/apache2/conf/httpd.conf && \
    sed -i 's|Listen 80|Listen 8080|' /usr/local/apache2/conf/httpd.conf && \
    mkdir -p /var/www && ln -s /usr/local/apache2/htdocs /var/www/html && \
    chmod -R g+rwX /usr/local/apache2 && \
    echo "ServerName localhost" >> /usr/local/apache2/conf/httpd.conf
COPY --from=builder /dashboard/target/dist/ /usr/local/apache2/htdocs/dashboard
RUN sed -i -r -e 's#<base href="/">#<base href="/dashboard/"#g'  /usr/local/apache2/htdocs/dashboard/index.html
