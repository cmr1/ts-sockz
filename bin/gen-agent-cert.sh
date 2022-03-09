# Generate script because certs expire in 1 year (365 days)

certs_dir=certs
cert_days=365
agent_name="Agent"

# generate self-signed (invalid) certifcate
openssl req \
	-newkey rsa:4096 \
	-keyout $certs_dir/agent_key.pem \
	-out $certs_dir/agent_csr.pem \
	-nodes \
	-days $cert_days \
	-subj "/CN=$agent_name"

# sign with agent_csr.pem
openssl x509 \
	-req \
	-in $certs_dir/agent_csr.pem \
	-signkey $certs_dir/agent_key.pem \
	-out $certs_dir/agent_cert.pem \
	-days $cert_days
