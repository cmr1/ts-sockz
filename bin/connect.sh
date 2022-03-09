#!/bin/bash

clientName=${1:-client}
hostName=${2:-localhost}
hostPort=${3:-2222}

openssl s_client -quiet -connect $hostName:$hostPort -cert certs/${clientName}_cert.pem -key certs/${clientName}_key.pem $4 $5
