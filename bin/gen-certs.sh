# Generate script because certs expire in 1 year (365 days)

certs_dir=certs
cert_days=365

server_org="Sockz"
server_host=localhost

agent_name="Agent"
client_name="Client"

# generate server certificate
openssl req \
	-x509 \
	-newkey rsa:4096 \
	-keyout $certs_dir/server_key.pem \
	-out $certs_dir/server_cert.pem \
	-nodes \
	-days $cert_days \
	-subj "/CN=$server_host/O=$server_org"

# generate server-signed (valid) certifcate
openssl req \
	-newkey rsa:4096 \
	-keyout $certs_dir/client_key.pem \
	-out $certs_dir/client_csr.pem \
	-nodes \
	-days $cert_days \
	-subj "/CN=$client_name"

# sign with server_cert.pem
openssl x509 \
	-req \
	-in $certs_dir/client_csr.pem \
	-CA $certs_dir/server_cert.pem \
	-CAkey $certs_dir/server_key.pem \
	-out $certs_dir/client_cert.pem \
	-set_serial 01 \
	-days $cert_days

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
