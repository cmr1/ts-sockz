# Generate script because certs expire in 1 year (365 days)

client_name=${1:-Client}
server_cert=${2:-server_cert.pem}
server_key=${3:-server_key.pem}
certs_dir=${4:-certs}
cert_days=${5:-365}

echo "Generating cert for client: $client_name ..."

# generate server-signed (valid) certifcate
openssl req \
	-newkey rsa:4096 \
	-keyout $certs_dir/${client_name}_key.pem \
	-out $certs_dir/${client_name}_csr.pem \
	-nodes \
	-days $cert_days \
	-subj "/CN=$client_name"

# sign with server_cert
openssl x509 \
	-req \
	-extfile <(printf "[v3_req]\nextendedKeyUsage=serverAuth") \
	-extensions v3_req \
	-in $certs_dir/${client_name}_csr.pem \
	-CA $certs_dir/$server_cert \
	-CAkey $certs_dir/$server_key \
	-out $certs_dir/${client_name}_cert.pem \
	-days $cert_days \
	-CAcreateserial \
	-sha256

# openssl x509 -req \
# 	-extfile <(printf "[v3_req]\nextendedKeyUsage=serverAuth") \
# 	-extensions v3_req \
# 	-days 365 -in mydomain.com.csr -CA rootCA.crt -CAkey rootCA.key \
# 	-CAcreateserial -out mydomain.com.csr -sha256
