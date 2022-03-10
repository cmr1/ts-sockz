FROM ubuntu:18.04
# FROM amazonlinux

# COPY config/rpm-user-data.sh /tmp/init.sh

# RUN cat /tmp/init.sh | bash

RUN apt-get update && \
    apt-get install -y vim curl lsb-release locales net-tools dhcp-client && \
    apt-get clean all && \
    locale-gen en_US.UTF-8

RUN echo "Building MiB..."

CMD [ "pwd && ls" ]
