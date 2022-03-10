#!/bin/bash

# Variables
floating_ip="137.184.242.52"
instance_ip="159.65.216.1"
instance_gw="159.65.216.0/21"

# Show timestamp
date

echo "Replacing ip and gw (change $instance_ip -> $floating_ip)"

# Find anchor ip gateway & address
anchor_gateway=$(curl -s http://169.254.169.254/metadata/v1/interfaces/public/0/anchor_ipv4/gateway)
anchor_address=$(curl -s http://169.254.169.254/metadata/v1/interfaces/public/0/anchor_ipv4/address)


# Replace instance GW with anchor GW
cmd1="ip route add default via $anchor_address dev eth0"
cmd2="ip route del $instance_gw"

echo "Run: $cmd1"
echo "Run: $cmd2"

# Verify ip replacement
ip route | grep "default via $anchor_gateway dev eth0" > /dev/null
if [[ "$?" != "0" ]]; then
  echo "ERROR: Unable to confirm ip changed to $anchor_address"
fi

ip route | grep $instance_ip > /dev/null
if [[ "$?" == "0" ]]; then
  echo "ERROR: Unable to confirm instance gw removed (found $instance_ip)"
fi


# Replace instance IP with anchor IP
cmd3="route add default gw $anchor_gateway"
cmd4="route del default gw $instance_ip"

echo "Run: $cmd3"
echo "Run: $cmd4"

# Verify new gw in routing table
route | grep default | grep $anchor_gateway > /dev/null
if [[ "$?" != "0" ]]; then
  echo "ERROR: Unable to confirm default gw changed to $anchor_gateway"
fi

# Verify the original instance_gw is removed
route | grep $instance_ip > /dev/null
if [[ "$?" == "0" ]]; then
  echo "ERROR: Unable to confirm gw removed (found $instance_ip)"
fi


# Check outbound IP
check_ip=$(curl -4 -s https://icanhazip.com)

if [[ "$check_ip" == "$floating_ip" ]]; then
  echo "Success. Floating IP configured: $floating_ip (replaced $instance_ip)"
else
  echo "FAILED. Outbound IP: $check_ip (expected $floating_ip)"
fi

echo "Done"
echo ""

Wed Mar  9 21:03:07 MST 2022
Replacing ip and gw (change 159.65.216.1 -> 137.184.242.52)
Run: ip route add default via 10.10.0.6 dev eth0
Run: ip route del 159.65.216.0/21
Run: route add default gw 10.10.0.1
Run: route del default gw 159.65.216.1
Success. Floating IP configured: 137.184.242.52 (replaced 159.65.216.1)
