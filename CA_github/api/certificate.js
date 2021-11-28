/*
 * API endpoint
 */

var util = require('util');
var fs = require('fs');
var exec = require('child_process').exec;

var certificate = {};

/**
 *  Request method creates certificate from .csr file
 */
certificate.request = function(req, res){
    console.log("------\r\nReceived a certificate request from %s!", req.body.data.applicant);
    //console.log("the req thing",req);
    csr = req.body.data.csr;
    console.log(csr);
    console.log("------\r\n\r\n");

    console.log("basepath: ", global.paths.basepath);
    console.log("pkipath: ", global.paths.pkipath);
    console.log("tempdir: ", global.paths.tempdir);


    // $ openssl rsa -in key.pk8 -out key.pem
    var signcommand = util.format('openssl x509 -req -in %srequest.csr -days 365 -CA %scerts/ca.cert.pem -CAkey %sprivate/key.pem -set_serial 1 -out cert.pem -extfile %sopenssl.conf -extensions v3_ca',global.paths.tempdir,global.paths.pkipath,global.paths.pkipath,global.paths.pkipath)

    // Write .csr file to tempdir
    fs.writeFile(global.paths.tempdir + 'request.csr', csr, function(err) {
        if(err) {
            console.log("Could not write temp request.csr file! Error: " + err);
        } else {
            console.log("Successfully wrote .csr file to tempdir.");

            exec(signcommand, { cwd: global.paths.tempdir }, function(error, stdout, stderr) {
                if (error === null) {
                    console.log("openssl ca command successful.");

                    // Read in generated certificate
                    fs.readFile(global.paths.tempdir + 'cert.pem', 'utf8', function(err, certdata){
                        if(err == null) {
                            //Send the generated certificate back now.
                            var response = {
                                success: true,
                                cert: certdata
                            }

                            res.end(JSON.stringify(response));
                            console.log("Response sent.");

                            // Remove files in tmp dir.
                            fs.unlinkSync(global.paths.tempdir + 'cert.pem');
                            fs.unlinkSync(global.paths.tempdir + 'request.csr');
                        } else {
                            console.log("Could not read generated cert file: " + err);
                        }
                    });
                } else {
                    console.log("openssl ca command not successful: Error: ", error)
                }
            });
        }
    });


}
var regex = /([R,E,V])(\t)(.*)(\t)(.*)(\t)([\dA-F]*)(\t)(unknown)(\t)(.*)/;


//Reindex files once revoked

var reindex = function() {
    return new Promise(function(resolve, reject) {
        console.log("Reindexing database ...");

        // open index file
        var lineReader = require('readline').createInterface({
            input: require('fs').createReadStream(global.paths.pkipath + 'index.txt')
        });

        certificates = [];

        lineReader.on('line', function (line) {
            // extract individual columns
            var columns = regex.exec(line);

            if(columns !== null){
                var certificate = {
                    state:   columns[1],
                    expirationtime:    columns[3],
                    revocationtime:     columns[5],
                    serial:     columns[7],
                    subject:    columns[11]
                };

                certificates.push(certificate);
            } else {
                log.error("Error while parsing index.txt line :(");
            }
        });

        lineReader.on('close', function() {
            console.log("Reindexing finished");

            // Re-Create CRL
            crl.createCRL();

            resolve();
        });
    });
}


/**
 * Revokes certificates
 */
certificate.revoke = function(req,res){
    console.log("------\r\nReceived a revocation request from %s!", req.body.data.applicant);
    cert = req.body.data.cert;
    console.log(cert);
    console.log("------\r\n\r\n");
    //var revokecommand = util.format('openssl ca -config %sopenssl-intermediate.conf -revoke %snew_certs/cert.pem',global.paths.pkipath,global.paths.pkipath);
   
   

    // Write .csr file to tempdir
    fs.writeFile(global.paths.tempdir + 'cert.pem', cert, function(err) {
        if(err) {
            console.log("Could not write temp .pem file! Error: " + err);
        } else {
            console.log("Successfully wrote .pem file to tempdir.");

            var revokecommand = util.format('openssl ca -config %sopenssl.conf -revoke cert.pem', global.paths.pkipath);
            exec(revokecommand, { cwd: global.paths.tempdir }, function(error, stdout, stderr) {
                if (error === null) {
                    console.log("openssl revoke command successful");

                    reindex().then(function(){
                        console.log("Successfully revoked certificate.");

                        reindex().then(function(){
                            console.log("Successfully re-indexed database.");

                            respond({
                                success: true
                            }, res);

                            resolve();
                        })
                        .catch(function(err){
                            console.log("Could not re-index database.");
                        });
                    });
                } else {
                    console.log("OpenSSL Error:\r\n", error);
                    errorresponse({ code:101, message:"Internal server error."}, res);
                    resolve();
                }
            });
        } 
    });
        



}


/*
* Return all certificates
*/
var getIndex = function() {
    return certificate;
}


/**
 * Lists certificates
 */
 certificate.list = function(req, res){
    

    console.log("Request: List all active certificates. Filter: " + req.body.data.state + ". By: " + req.body.data.username);

    var filter = '';

    switch(data.state) {
        case 'all':
            filter = '';
            break;
        case 'revoked':
            filter = 'R';
            break;
        case 'valid':
            filter = 'V';
            break;
        case 'expired':
            filter = 'E';
            break;
        default:
            // Filter is invalid
            respond({ success: false }, res);
    }

    // Get certificate index
    var certindex = getIndex();

    var result = new Array();

    certindex.forEach(function(certificate) {
        if(filter == '') {
            result.push(certificate);
        } else {
            if(certificate.state === filter) {
                result.push(certificate);
            }
        }
    });

    respond({
        certs: result,
        success: true
    }, res);
};

/**
 * Gets certificate requests
 */
certificate.get = function(req, res) {

    var data = req.body.data;
    var auth = req.body.auth;

    log.info("Request: Get certificate. By: " + auth.username);

    var certfile = global.paths.pkipath + "newcerts/" + data.serialnumber + ".pem";

    if(fs.existsSync(certfile)){
        fs.readFile(certfile, 'utf8', function(err, certdata){
            if(err) {
                log.error("Could not read certificate file.");
                errorresponse({ code:101, message:"Internal server error."}, res);
            } else {
                respond({
                    success: true,
                    cert: certdata
                }, res);
            }
        });
    } else {
        // Certificate file not found.
        log.error("Certificate file not found.")
        errorresponse({ code:101, message:"Internal server error."}, res);
    }
};







module.exports = {
    certificate: certificate
}

