# Copyright (c) 2021     Red Hat, Inc.
# This program and the accompanying materials are made
# available under the terms of the Eclipse Public License 2.0
# which is available at https://www.eclipse.org/legal/epl-2.0/
#
# SPDX-License-Identifier: EPL-2.0
#
# Contributors:
#   Red Hat, Inc. - initial API and implementation

# https://access.redhat.com/containers/?tab=tags#/registry.access.redhat.com/ubi8/nodejs-12
FROM registry.access.redhat.com/ubi8/nodejs-12:1-77 as builder
USER 0
RUN yum -y -q update && \
    yum -y -q clean all && rm -rf /var/cache/yum

RUN npm install yarn -g && \
    yarn -v && \
    # Set the default to yarn 2
    yarn set version berry

COPY package.json /dashboard/
COPY yarn.lock /dashboard/
COPY .yarn/releases/yarn-*.cjs /dashboard/.yarn/releases/
COPY .yarnrc.yml /dashboard/
WORKDIR /dashboard
RUN yarn install
COPY . /dashboard/
RUN yarn compile

# https://access.redhat.com/containers/?tab=support#/registry.access.redhat.com/ubi8/ubi
FROM registry.access.redhat.com/rhscl/httpd-24-rhel7:2.4-114

# DOWNSTREAM: use RHEL8/httpd
# https://access.redhat.com/containers/?tab=tags#/registry.access.redhat.com/rhel8/httpd-24
# FROM registry.redhat.io/rhel8/httpd-24:1-92
USER 0

# latest httpd container doesn't include ssl cert, so generate one
RUN chmod +x /usr/share/container-scripts/httpd/pre-init/40-ssl-certs.sh && \
    /usr/share/container-scripts/httpd/pre-init/40-ssl-certs.sh
RUN yum update -y systemd && yum clean all && rm -rf /var/cache/yum && \
    echo "Installed Packages" && rpm -qa | sort -V && echo "End Of Installed Packages"

# configure apache
RUN sed -i 's|    AllowOverride None|    AllowOverride All|' /etc/httpd/conf/httpd.conf && \
    sed -i 's|Listen 80|Listen 8080|' /etc/httpd/conf/httpd.conf && \
    mkdir -p /var/www && ln -s /etc/httpd/htdocs /var/www/html && \
    chmod -R g+rwX /etc/httpd/ && \
    echo "ServerName localhost" >> /etc/httpd/conf/httpd.conf

COPY .htaccess /var/www/html/
COPY --from=builder /dashboard/lib /var/www/html/dashboard
RUN sed -i -r -e 's#<base href="/">#<base href="/dashboard/"#g'  /var/www/html/dashboard/index.html

COPY build/dockerfiles/rhel.entrypoint.sh /usr/local/bin
CMD ["/usr/local/bin/rhel.entrypoint.sh"]

## Append Brew metadata
