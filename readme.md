This is the backend contribution of https://github.com/tb960/NodeCA.


## Implemented Features

* Auto-create a PKI with root CA and intermediate CA
* Request new certificates
* List available certificates
* Download issued certificate files
* Revoke issued certificate


## Setup instructions

    git clone https://github.com/ifeelsleepy/NodeCA_Backend.git
    cd nodepki
    npm install  


## Details about the API 

## Request examples


List all issued certificates:

```
curl -H "Content-type: application/json" -d '{ "data": { "state":"all" }, "auth": { "username":"john" } }' http://localhost:8080/certificate/list
```


Request certificate from CSR:

```
curl -H "Content-type: application/json" -d '{ "data": { "applicant":"John", "csr":"---CERTIFICATE SIGNING REQUEST---", "lifetime":365, "type":"server" }, "auth": { "username":"thomas" } }' http://localhost:8080/certificate/request
```


## Certificates

### Request certificate

    PUT /certificate/request/

    Request params:
    * applicant: <String> | Applicant, who requests certificate (for future usage)
    * csr: <String> | CSR data in PEM format
    * lifetime: <Int> (optional) | Lifetime of certificate in days
    * type: <Enum/String> (optional) | Certificate type. Can be 'server', 'client'. Defaults to 'server'

    Response attributes:
    * cert: <String> | certificate



### Revoke certificate

    POST /certificate/revoke/

    Request params:
    * cert: <String> | Certificate to revoke in PEM format

    Response attributes: success


### Get certificate

    GET /certificate/:id/get/

    Request params:
    * id: <String> | Serial number of the certificate

    Response attributes:
    * cert: <String> | Certificate



### List certificates  

    POST /certificates/list/

    Request params:
    * state: <Enum/String> | 'valid', 'expired', 'revoked', 'all'

    Response body:     
     {   
        success: <bool>,
        certs: [
            {
                state: <state>,
                expirationtime: <time>,
                revocationtime: <time>,
                serial: <serial>,
                subject: <subject>
             },
            ...
        ]
    }



## Errors

Example error response:

    {
        errors: [
            {
                code: 422,
                message: "Invalid data type"
            }
        ]
    }


### General error codes

* 100: Invalid / insufficient API input (see errormessage)
* 101: Internal server processing error.
* 200: Invalid authentication credentials
