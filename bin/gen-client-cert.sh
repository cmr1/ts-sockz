# Generate script because certs expire in 1 year (365 days)

client_name=${1:-Client}
cert_days=${2:-365}
certs_dir=${3:-certs}

echo "Generating cert for client: $client_name ..."

# generate server-signed (valid) certifcate
openssl req \
	-newkey rsa:4096 \
	-keyout $certs_dir/${client_name}_key.pem \
	-out $certs_dir/${client_name}_csr.pem \
	-nodes \
	-days $cert_days \
	-subj "/CN=$client_name"

# sign with server_cert.pem
openssl x509 \
	-req \
	-in $certs_dir/${client_name}_csr.pem \
	-CA $certs_dir/server_cert.pem \
	-CAkey $certs_dir/server_key.pem \
	-out $certs_dir/${client_name}_cert.pem \
	-set_serial 01 \
	-days $cert_days
