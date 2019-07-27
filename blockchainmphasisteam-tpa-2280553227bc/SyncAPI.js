console.log("Quorum API for Group Insurance");

/**
 * @file    TpaAPI version 0.1
 * @file    API runs at http://localhost:5006
 * @file    API for TPA to invoke and query smart contract. This api works with only quorum blockchain. Platform will be expanded later. :)
 */

// required modules
var fs = require("fs");
var Web3 = require('web3-quorum');
var cors = require('cors');
var xhr = require('request');
var PDFDocument = require('pdfkit');


//mongod for local storage
// NOTE: install mongodb@2.2.33 
// do --> npm install mongodb@2.2.33 --save

var MongoClient = require('mongodb').MongoClient;
const abiDecoder = require('abi-decoder');
const express = require('express');

// md5 for generating hash
var md5 = require('md5');
const app = express();

// express file upload library
const fileUpload = require('express-fileupload');

var bodyParser = require('body-parser');
app.use(bodyParser.json());

// setting cors option for app
app.use(cors());
app.use(fileUpload());
app.options("*",cors());

// ipfs javascript http-client library
var ipfsAPI = require('ipfs-api');

//ipfs connection
var ipfs = ipfsAPI('/ip4/127.0.0.1/tcp/5001');
console.log("Starting API ");

// connecting to web3 provider
var web3 = new Web3(new Web3.providers.HttpProvider("http://localhost:22001"));
var appPort=5000;

// contracts
var policyContractAddress       = "0x9eb8d7e5bc8b742c5984655a352417b4af5c8579";
var insuranceContractAddress    = "0xbc8946145b67c12ecc76d5885dd20d28e53482c6";
var claimContractAddress        = "0x0cc912232a8dd54dadfc2c61d9a634da93fe9ada";
var hospitalContractAddress       = "0x6e59372e7267648d830a1d0843951a8c347963e1";



//read contract addresses from contractsConfig.json
let rawdata = fs.readFileSync('./contractConfig.json');  
let contractsData = JSON.parse(rawdata);
console.log(JSON.stringify(contractsData));

policyContractAddress = contractsData.policyContract;
insuranceContractAddress = contractsData.insuranceContract;
claimContractAddress = contractsData.claimContract;
hospitalContractAddress = contractsData.hospitalContract;





//reading abi from file

//Policy.sol
var policyContractSource = fs.readFileSync("Policy.json");
var policyContract = JSON.parse(policyContractSource)["contracts"];
var policyabi = JSON.parse(policyContract["Policy.sol:Policy"].abi);
const deployedPolicyContract = web3.eth.contract(policyabi).at(String(policyContractAddress));

//Insurance.sol
var insuranceContractSource = fs.readFileSync("Insurance.json");
var insuranceContract = JSON.parse(insuranceContractSource)["contracts"];
var insuranceabi = JSON.parse(insuranceContract["Insurance.sol:Insurance"].abi);
const deployedInsuranceContract = web3.eth.contract(insuranceabi).at(String(insuranceContractAddress));


//ClaimManagement.sol
var claimContractSource = fs.readFileSync("ClaimManagement.json");
var claimContract = JSON.parse(claimContractSource)["contracts"];
var claimabi = JSON.parse(claimContract["ClaimManagement.sol:ClaimManagement"].abi);
const deployedClaimContract = web3.eth.contract(claimabi).at(String(claimContractAddress));


//Hospital.sol
var hospitalContractSource = fs.readFileSync("Hospital.json");
var hospitalContract = JSON.parse(hospitalContractSource)["contracts"];
var hospitalabi = JSON.parse(hospitalContract["Hospital.sol:Hospital"].abi);
const deployedHospitalContract = web3.eth.contract(hospitalabi).at(String(hospitalContractAddress));

//company Name
//var companyName = "ALight";

//marsh wallet address;

let configRawData = fs.readFileSync('./config.json');  
let configData = JSON.parse(configRawData);

var marshAddress = configData.brokerWalletAddress;
//var brokerName =   "Broker";

//tpa wallet address;
//var tpaAddress = "0x50bb02281de5f00cc1f1dd5a6692da3fa9b2d912";

var tpaAddress = configData.tpaWalletAddress;

//insurance wallet address;
//var insuranceAddress = "0xcd5b17da5ad176905c12fc85ce43ec287ab55363";


// mongodb url for api's
var claimListDBUrl = "mongodb://localhost:27017/claimlist_db";
var clientListDBUrl = "mongodb://localhost:27017/clientlist_db";
var claimListDB;
var claimListQueryDB;
var clientListDB;
var clientListQueryDB;


MongoClient.connect(claimListDBUrl, function(err, claimListDBTemp) {
    claimListDB = claimListDBTemp;
});

MongoClient.connect(clientListDBUrl, function(err, clientListDBTemp) {
    clientListDB = clientListDBTemp;
});

var mongoUrl = "mongodb://127.0.0.1:27017/";





/**
 * 
 * API to get All Customer Policies
 * 
 * @function                    getAllCustomerPolicies
 * 
 * @returns     {JSONArray}     customerPolicies        -  all customer policies
 */

app.get('/getAllCustomerPolicies',function(request, response){
    console.log("****************** get all customer policies *********************");
    clientListDB.collection("clientlist").find().toArray(function(err, result) {
        if (err) throw err;
        console.log(result);
        return response.send(result.reverse());
    });
});


function syncClientList(){
    console.log("Syncing ClientList");
    console.log("****************** get all customer policies *********************");
    var policiesObject = deployedInsuranceContract['getTpaPolicies'](tpaAddress);
    var policies = [];
    for(var index = 0; index < policiesObject.length; index++){
        var policyId = policiesObject[index];
        var policyObject = deployedPolicyContract['getPolicy'](policyId, tpaAddress);
        console.log("printing policyObject : "+policyObject);
        var policyOwnerStatus = deployedInsuranceContract['getPolicyOwnersStatus'](policyId);
        var policyHolderAddress = policyObject[1];
        var policyHolderDetails = deployedPolicyContract['getCustomerDetails'](policyHolderAddress);
        var insuredAmount = policyHolderDetails[3];
        var customerName = policyHolderDetails[1];
        var customerAddress = policyHolderDetails[0];
        var policyDetails = {
            policyId                :   policyId.toNumber(),
            policyValidity          :   policyObject[2].toNumber(),
            policyDocumentHash      :   (web3.toUtf8(policyObject[3])+web3.toUtf8(policyObject[4])),
            timestamp               :   policyObject[5].toNumber(),
            sumInsured              :   insuredAmount.toNumber(),
            customerName            :   customerName,
            policyOwnerStatus       :   policyOwnerStatus,
            policyHolderAddress     :   customerAddress
        }
         //push the object into mongodb 
         var query = {policyId:policyId.toNumber()};
         var obj = policyDetails;
         clientListDB.collection("clientlist").update(query,obj,{upsert: true}, function(err,doc){
                  if (err) throw err;
                  console.log("Record inserted/updated ..");
         })
    }
}

setInterval(function(){
    console.log("*********************** starting clientList sync function **************************");
    syncClientList();

},8000);


















/*** get claims api */

/**
 * 
 * API to get list of claims applied
 * 
 * @function                    getClaimListForTPA
 * 
 * @returns     {JSONArray}     claimList
 * 
 */
/*
app.get('/getClaimListForTPA',function(request, response){
    console.log("**************** Get Claim Request List ******************");
    claimListDB.collection("claimlist").find().toArray(function(err, result) {
        if (err) throw err;
        console.log(result);
        return response.send(result.reverse());
      });
});


function syncClaimList(){
    console.log("**************** Syncing claim list for TPA *******************");
    console.log("******************* get claim list for TPA ********************");
    
    var claimListObject = deployedInsuranceContract['getTpaClaims'](tpaAddress);
    console.log("printing claimList for tpa "+JSON.stringify(claimListObject));
    var claimList=[];

    for(var index = 0; index < claimListObject.length; index++){
        var claimId = claimListObject[index];
        var initialClaimObject = deployedClaimContract['getInitialClaimDetails'](claimId);
        //console.log("printing initial claim details : "+initialClaimObject);
        var claimDetailsObject = deployedClaimContract['getClaimDetails'](claimId);
        var policyId = initialClaimObject[1];
        //get customerName and patientName
        var policyObject   = deployedPolicyContract['getPolicy'](policyId, marshAddress);
        var customerAddress = policyObject[1];
        var customerObject = deployedPolicyContract['getCustomerDetails'](customerAddress);
        var customerName = customerObject[1];
        var patientObject = deployedHospitalContract['getPatientDetails'](initialClaimObject[0]);

        //console.log("printing patientObject  : "+JSON.stringify(patientObject));
        var patientName = patientObject[2];

        var approverName = web3.toUtf8(deployedInsuranceContract['getCompanyName'](initialClaimObject[6]));

        var initialClaimDetails = {
            claimId:claimId.toNumber(),
            policyHolderName:customerName,
            patientName:patientName,
            claimStatus:web3.toUtf8(claimDetailsObject[0]),
            patientAddress:initialClaimObject[0],
            policyId:initialClaimObject[1].toNumber(),
            timestamp:initialClaimObject[2].toNumber(),
            claimEstimate:initialClaimObject[3].toNumber(),
            estimateDocument:web3.toUtf8(initialClaimObject[4])+web3.toUtf8(initialClaimObject[5]),
            initiallyApprovedBy:initialClaimObject[6],
            approverName:approverName
        }


        //push the object into mongodb 
        var query = {claimId:claimId.toNumber()};
        var obj = initialClaimDetails;
        claimListDB.collection("claimlist").update(query,obj,{upsert: true}, function(err,doc){
                 if (err) throw err;
                 console.log("Record inserted/updated ..");
        })

}
}

setInterval(function(){
    console.log("*************** starting syncClaimList **************");
    syncClaimList();
},10000);
*/
