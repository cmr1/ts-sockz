#!/bin/bash

# Sockz Server UserData (init script)

# Install & enable EPEL repository
amazon-linux-extras install epel -y
yum-config-manager --enable epel

# Updates from package manager
yum update -y

# Setup for nodejs v14 install (via yum next step)
curl -sL https://rpm.nodesource.com/setup_14.x | bash -

# Install required packages
yum install -y git gcc-c++ make nodejs

# Upgrade NPM to latest version
npm install --global npm@latest sockz@latest
