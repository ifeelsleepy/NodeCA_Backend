/*
 * Revokes a certificate
 */

var http = require('http');
var fs = require('fs');

function revoketCert(csrdata) {
    var req = http.request({
        host: 'localhost',
        port: 8081,
        path: '/certificate/revoke/',
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        }
    }, function (response){
        var body = '';

        response.on('data', function(chunk) {
            body += chunk;
        });

        response.on('end', function() {
            console.log("Body:\r\n" + body);
        });
    });


    var jsonobj = {
        csr: csrdata,
        applicant: "John Doe"
    };

    var json = JSON.stringify(jsonobj);
    req.write(json);

    req.end();
};



/*
 * Read cert data from file
 */

fs.readFile('/Users/shivanikannan/CA_github/certrequest/cert.csr', 'utf8', function(err, csrdata){
    if(err == null) {
        revokeCert(csrdata);
    } else {
        console.log("Error reading file:" + err);
    }
});