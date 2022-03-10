#!/bin/bash

# cmd
# mailinabox (sudo)

# Find anchor ip gateway & address
anchor_gateway=$(curl -s http://169.254.169.254/metadata/v1/interfaces/public/0/anchor_ipv4/gateway)
anchor_address=$(curl -s http://169.254.169.254/metadata/v1/interfaces/public/0/anchor_ipv4/address)

# Enable Outbound Floating IP Traffic Immediately
# sh -c "ip route del 0/0; ip route add default via $anchor dev eth0"

curl --interface $anchor https://example.com

wget --bind-address=$anchor https://example.com


# Check outbound IP
curl -4 https://icanhazip.com/

# Run MiB setup
curl -s https://mailinabox.email/setup.sh | bash
