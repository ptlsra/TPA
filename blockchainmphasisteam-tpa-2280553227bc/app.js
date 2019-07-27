
/**
 * @file    TpaAPI version 0.1
 * @file    API runs at http://localhost:5006
 * @file    API for TPA to invoke and query smart contract. This api works with only quorum blockchain. Platform will be expanded later. :)
 */

// required modules
var fs = require("fs");
var Web3 = require('web3-quorum');
var cors = require('cors');
var log4js = require('log4js');
var logger = log4js.getLogger('app.js');
var morganLogger = require('morgan');

//mongod for local storage
// NOTE: install mongodb@2.2.33 
// do --> npm install mongodb@2.2.33 --save
var MongoClient = require('mongodb').MongoClient;
const express = require('express');
const app = express();

// express file upload library
const fileUpload = require('express-fileupload');

var bodyParser = require('body-parser');
app.use(bodyParser.json());
app.use(morganLogger('dev'));

// setting cors option for app
app.use(cors());
app.use(fileUpload());
app.options("*",cors());

/**
 * 
 * UI integration
 */
//app.use(express.static());
var pathval=__dirname + "/UI/";
console.log(pathval);
app.set('views',pathval);

app.use(express.static(pathval));

/**
 * 
 * Read configuration from config.json
 */
let configRawData = fs.readFileSync('./config.json');  
let configData = JSON.parse(configRawData);

//company Name
var companyName = configData.companyName;
var tpaAddress = configData.tpaWalletAddress;
var appPort = configData.appPort;
var tpaWalletPassword = configData.tpaWalletPassword;
logger.level = configData.logLevel;
var web3Url = configData.web3Url;
var mongoIp = configData.mongoIp;
var mongoPort = configData.mongoPort;
var appIp = configData.appIp;
var appIpAddress = mongoIp;
var ipfsIpAddress = configData.ipfsIp;

// connecting to web3 provider
var web3 = new Web3(new Web3.providers.HttpProvider(web3Url));


//read contract addresses from contractsConfig.json
let rawdata = fs.readFileSync('./contractConfig.json');  
let contractsData = JSON.parse(rawdata);
logger.debug(JSON.stringify(contractsData));

var policyContractAddress = contractsData.policyContract;
var insuranceContractAddress = contractsData.insuranceContract;
var claimContractAddress = contractsData.claimContract;
var hospitalContractAddress = contractsData.hospitalContract;



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




logger.debug("Starting API ");

//marsh wallet address;
var marshAddress = "0x2e219248f44546d966808cdd20cb6c36df6efa82";

// mongodb url for api's
var claimListDBUrl = "mongodb://"+mongoIp+":"+mongoPort+"/tpa_claimlist_db";
var clientListDBUrl = "mongodb://"+mongoIp+":"+mongoPort+"/clientlist_db";
var claimListDB;
var clientListDB;

MongoClient.connect(claimListDBUrl, function(err, claimListDBTemp) {
    claimListDB = claimListDBTemp;
});

MongoClient.connect(clientListDBUrl, function(err, clientListDBTemp) {
    clientListDB = clientListDBTemp;
});

var mongoUrl = "mongodb://"+mongoIp+":"+mongoPort+"/";

var tpaTxnsUrl = mongoUrl+companyName+"_txns";
var tpaTxnsDB;
MongoClient.connect(tpaTxnsUrl, function(err, tpaTxnsTempDB) {
    if (err) throw err;
    tpaTxnsDB = tpaTxnsTempDB;
});

var tpaCustomerTxnsDBUrl = mongoUrl+companyName+"_customer_txns";
var tpaCustomerTxnsDB;
MongoClient.connect(tpaCustomerTxnsDBUrl, function(err, tpaCustomerTxnsTempDB){
    if (err) throw err;
    tpaCustomerTxnsDB = tpaCustomerTxnsTempDB;
});



//************************************************* Events ************************************************** */

/**
 * Registration Event.
 * @event
 */
var registrationEvent;
registrationEvent = deployedPolicyContract.RegisterCustomer({}, {fromBlock:'latest',toBlock:'latest'});
    //logger.debug(myEvent);
    registrationEvent.watch(function(error, result) {
            logger.debug("*************** Register Customer Event ***************");
            logger.debug(result);
            logger.debug("*********** prints args of result **********");
            logger.debug(result);
            var args = result.args;
            storeCustomerTransaction(args.userName, result.transactionHash, args.description,args.customerAddress);
            logger.debug("transaction sent to db");
    });


/**
 * Policy Creation Event.
 * @event
 */
var policyCreationEvent;
policyCreationEvent = deployedPolicyContract.CreatePolicy({}, {fromBlock:'latest',toBlock:'latest'});
    //logger.debug(myEvent);
    policyCreationEvent.watch(function(error, result) {
            logger.debug("*************** Policy Creation Event ***************");
            logger.debug(result);
            logger.debug("*********** prints args of result **********");
            logger.debug(result);
            var args = result.args;

            logger.debug("displaying loanId in number "+args.policyId);
            logger.debug(args.policyId.toNumber());

            storeCustomerTransaction(args.userName, result.transactionHash, args.description, args.customerAddress, args.policyId.toNumber());
            logger.debug("transaction sent to db");

            logger.debug("calling insertCustomerPolicyRecord");
            insertCustomerPolicyRecord(args.policyId);
    });

/**
 * Adding Dependent Event.
 * @event
 */
var addDependentEvent;
addDependentEvent = deployedPolicyContract.AddDependent({}, {fromBlock:'latest',toBlock:'latest'});
    //logger.debug(myEvent);
    addDependentEvent.watch(function(error, result) {
            logger.debug("*************** Add Dependent  Event ***************");
            logger.debug(result);
            logger.debug("*************** prints args of result ***************");
            logger.debug(result);
            var args = result.args;

            logger.debug("displaying loanId in number "+args.policyId);
            logger.debug(args.policyId.toNumber());

            storeCustomerTransaction(args.userName, result.transactionHash, args.description, args.customerAddress, args.policyId.toNumber());
            logger.debug("transaction sent to db");
    });

/**
 * Register TPA event
 * @event
 * 
 */

var registerTPA;

registerTPA = deployedInsuranceContract.RegisterTPA({}, {fromBlock:'latest', toBlock:'latest'});
    registerTPA.watch(function(error, result){
        logger.debug("****************** register TPA event *********************");
        logger.debug(result);

        logger.debug("printing arguments : "+result.args);
        var args = result.args;
        //storeBrokerTransaction("marsh", result.transactionHash, args.description, "");
        if(args.tpaAddress == tpaAddress){
            //storeInsuranceTransaction(companyName, result.transactionHash, args.description, "");
            storeTPATransactions(companyName, result.transactionHash, args.description, "");
            logger.debug("transaction sent to db");
        }else{
            logger.debug("not my event :( ");
        }
    });

/**
 * SetPolicyOwner Event
 * @event
 * 
 */

var setPolicyOwner;

setPolicyOwner = deployedInsuranceContract.SetPolicyOwners({},{fromBlock:'latest', toBlock:'latest'});
    setPolicyOwner.watch(function(error, result){
        logger.debug("******************  set policy owner event *********************");
        logger.debug(result);
        logger.debug("printing arguments : "+result.args);
        var args = result.args;
        if(args.tpaAddress == tpaAddress){
           storeTPATransactions(companyName, result.transactionHash, args.description, args.policyId.toNumber());
            
           logger.debug("transaction sent to db");
        }else{
            logger.debug("not my event :( ");            
        }
       
    });



/**
 * 
 * Initial claim event
 * @event
 * 
 */
initialClaim = deployedClaimContract.InitialClaimEvent({}, {fromBlock:'latest', toBlock:'latest'});
initialClaim.watch(function(error, result){
    logger.info("initial claim event");
    logger.debug("printing arguments : "+result.args);
    insertClaimRecord(result.args.claimId);
});





/**
 * 
 * AcceptClaim event
 * @event
 * 
 * 
 */

var acceptClaim;

acceptClaim = deployedClaimContract.InitialClaimApproval({},{fromBlock:'latest', toBlock:'latest'});
acceptClaim.watch(function(error, result){
    logger.debug("******************  Accept Claim Event *********************");
    logger.debug(result);
    logger.debug("printing arguments : "+result.args);
    var args = result.args;
    //storeBrokerTransaction("marsh", result.transactionHash, args.description, "");
    if(args.fromAddress == tpaAddress){
        storeTPATransactions(companyName, result.transactionHash, args.description, args.policyId.toNumber());
        
        logger.debug("transaction sent to db");
    }else{
        logger.debug("not my event :( ");            
    }
});

/**
 * FinalClaimApprove event
 * @event
 * 
 */

var finalClaimApproval;
finalClaimApproval = deployedClaimContract.FinalClaimApproval({},{fromBlock:'latest', toBlock:'latest'});
finalClaimApproval.watch(function(error, result){
    logger.debug("****************** Final Claim Approval Event *********************");
    logger.debug(result);
    logger.debug("printing arguments : "+result.args);
    var args = result.args;
   // storeBrokerTransaction("marsh", result.transactionHash, args.description, "");
        if(args.fromAddress == tpaAddress){
            storeTPATransactions(companyName, result.transactionHash, args.description, args.policyId.toNumber());
            
            logger.debug("transaction sent to db");
        }else{
            logger.debug("not my event :( ");            
        }
});


var updateClaimStatus;
updateClaimStatus = deployedClaimContract.UpdateClaimStatus({}, {fromBlock:'latest', toBlock:'latest'});
updateClaimStatus.watch(function(error, result){
    logger.info("updateClaimStatus");
    logger.debug("result : "+result);
    updateClaimRecord(result.args.claimId, result.args.claimStatus);
});

/**
 * UploadEstimateDocument
 * @event
 */
uploadEstimateDocument = deployedClaimContract.UploadEstimateDocument({}, {fromBlock:'latest', toBlock:'latest'});

uploadEstimateDocument.watch(function(error, result){
    logger.info("uploadEstimateDocument");
    logger.debug("result : "+result);
    //new method to update claimlist_db
    //Just update estimateDocument key in the record
    //search the record by claimid
    updateEstimateDocument(result.args.claimId);
});



/**************************************** API starts here ************************************************/


/**
* API to register tpa
* @function                    registerTpa
* @param       {string}        tpaName           - name of the tpa
* 
* @returns     {JSONObject}    tpaInfo           - tpa info
*/

app.get('/registerTpa', function(request, response){
   logger.debug("************************* register tpa ****************************");

   var tpaName  = request.query.tpaName;
   //var insuranceAddress = insuranceAddress;
   web3.personal.unlockAccount(tpaAddress, tpaWalletPassword);

   var txId = deployedInsuranceContract['registerTPA'](tpaAddress, tpaName, {from: tpaAddress, gas:400000});

   var tpaInfo = {
    tpaAddress:tpaAddress,
    tpaName:tpaName,
    txId: txId
   }

   response.send(tpaInfo);
});



/**
 * API to get list of broker from blockchain
 * @function                    getBrokerList
 * 
 * @returns     {JSONArray}     brokerList      -   returns list of brokerInfo (contains brokerName and brokerAddress)
 */
app.get('/getBrokerList',function(request, response){
    logger.debug("********************* get list of brokers **********************************");

    var brokerAddressList   =   deployedInsuranceContract['getListOfBrokers']();

    logger.debug("printing broker list : "+brokerAddressList);
    var brokerList=[];
    for(let index = 0 ; index < brokerAddressList.length; index++){
        var brokerObject = deployedInsuranceContract['getBroker'](brokerAddressList[index]);

        var broker = {
            "brokerAddress":brokerObject[0],
            "brokerName":web3.toUtf8(brokerObject[1])
        }
        
        brokerList.push(broker);
    }

    //sending response to browser
    response.send(brokerList);

 });

/**
 * API to get list of all tpa's
 * @function                getTPAList
 * 
 * @returns     {JSONArray} tpaList             - list of all tpa's in the blockchain
 */
app.get('/getTPAList',function(request, response){
    logger.debug("************************* get list of tpa's ***************************");
    var tpaAddressList = deployedInsuranceContract['getListOfTPAs']();
    logger.debug("printing tpa list "+tpaAddressList);
    var tpaList = [];
    for(var index = 0; index < tpaAddressList.length; index++){
        var tpaObject = deployedInsuranceContract['getTPA'](tpaAddressList[index]);
        var tpa = {
            "tpaAddress":tpaObject[0],
            "tpaName":web3.toUtf8(tpaObject[1])
        }
        tpaList.push(tpa);
    }
    response.send(tpaList);
});


/**
 * API to get list of all insurance company
 * 
 * @function                getInsuranceList
 * 
 * @returns     {JSONArray} insuranceList       - lis of all insurance comapanies
 */
app.get('/getInsuranceList',function(request, response){
    logger.debug("************************* get list of Insurance companies ***************************");

    var insuranceAddressList = deployedInsuranceContract['getListOfInsuranceCompanies']();

    logger.debug("printing insuranceAddressList  "+insuranceAddressList);
    var insuranceList = [];

    for(var index = 0; index < insuranceAddressList.length; index++){
        var insuranceObject = deployedInsuranceContract['getInsuranceCompany'](insuranceAddressList[index]);

        var insurance = {
            "insuranceAddress":insuranceObject[0],
            "insuranceName":web3.toUtf8(insuranceObject[1])
        }
       insuranceList.push(insurance);
    }

    response.send(insuranceList);
});



/**
 * API to get broker info
 * @function                    getBrokerInfo
 * @returns     {JSONObject}    brokerInfo      - returns brokerName and brokerAddress
 */
app.get('/getBrokerInfo',function(request, response){
    logger.debug("********************** get broker info ****************************");
    var brokerAddress   = request.query.brokerAddress;

    var brokerObject    =   deployedInsuranceContract['getBroker'](brokerAddress);
    logger.debug("printing brokerObject : "+brokerObject);

    var brokerInfo = {
        brokerAddress:brokerObject[0],
        brokerName:web3.toUtf8(brokerObject[1])
    }

    response.send(brokerInfo);
});

/**
 * API to get policyOwners
 * @function                    getPolicyOwners
 * @param       {string}        policyId
 * 
 * @returns     {JSONObject}    policyOwners    - returns policyId and policyOwners
 * 
 */
app.get('/getPolicyOwners', function(request, response){
    logger.debug("********************** get policy owners ***********************");
    var policyId    =   request.query.policyId;

    var policyOwnerObject = deployedInsuranceContract['getPolicyOwners'](policyId);

    logger.debug("printing policyOwnerObject : "+policyOwnerObject);

    var policyOwners={
        policyId:policyId,
        insuranceAddress:policyOwnerObject[0],
        tpaAddress:policyOwnerObject[1],
        brokerAddress:policyOwnerObject[2]
    }

    response.send(policyOwners);
});



/**
 * API to set policy owners for a policy
 * 
 * @function                    setPolicyOwners
 * 
 * @param       {number}        policyId            -   policyId of the customer
 * @param       {string}        brokerAddress       -   brokerAddress
 * @param       {string}        insuranceAddress    -   insuranceAddress 
 * 
 * @returns     {JSONObject}    txId                -   transaction id
 */

app.post('/setPolicyOwners', function (request, response) {

    try {
        var policyId = request.query.policyId;
        var brokerAddress = request.query.brokerAddress;
        var insuranceAddress = request.query.insuranceAddress;

        var isError = false;

        if (isNaN(policyId)) {
            console.log(new Error("policyId is not a number"));
            isError = true;
        }

        if (isError == false) {

            logger.debug("********************** set policy owners ************************");
            web3.personal.unlockAccount(tpaAddress, tpaWalletPassword);
            var txId = deployedInsuranceContract['setPolicyOwners'](policyId, brokerAddress, insuranceAddress, tpaAddress, {
                from: tpaAddress,
                gas: 400000
            });
            var jsonResponse = {
                txId: txId
            }

            response.send(jsonResponse);
        } else {
            response.send({
                "error": "Error in setPolicyOwners"
            });
        }
    } catch (e) {
        logger.error("Error : " + e);
    }
});



/**
 * API to get customer Policy Details
 * 
 * @function                    getPolicyDetails
 * @param       {number}        policyId            -   policyId of the customer
 * @returns     {JSONObject}    policyDetails       -   returns policyDetails
 */
app.get('/getPolicyDetails',function(request, response){
    var policyId    =   request.query.policyId;

    logger.debug("********************* get customerPolicyDetails ***************************");
    var policyObject = deployedPolicyContract['getPolicy'](policyId, tpaAddress);
    logger.debug("printing policyObject : "+policyObject);
    var policyOwnerStatus = deployedInsuranceContract['getPolicyOwnersStatus'](policyId);

    var customerAddress = policyObject[1];
    
    var customerDetailsObject = deployedPolicyContract['getCustomerDetails'](customerAddress);
    
    var customerName = customerDetailsObject[1];

    var policyOwners      = deployedInsuranceContract['getPolicyOwners'](policyId);
    
        //get names of policyOwners
        var brokerName = web3.toUtf8(deployedInsuranceContract['getCompanyName'](policyOwners[2]));
        var insuranceName = web3.toUtf8(deployedInsuranceContract['getCompanyName'](policyOwners[0]));
        var tpaName      = web3.toUtf8(deployedInsuranceContract['getCompanyName'](policyOwners[1]));
    
        var policyProviderObject = {
            brokerAddress : policyOwners[2],
            brokerName:brokerName,
            insuranceAddress: policyOwners[0],
            insuranceName:insuranceName,
            tpaAddress:policyOwners[1],
            tpaName:tpaName
        }

    var policyDetails = {
        policyId                :   policyId,
        policyHolderName        :   customerName,
        policyProviderAddress   :   policyObject[0],
        customerAddress         :   policyObject[1],
        policyValidity          :   policyObject[2],
        policyDocumentHash      :   web3.toUtf8(policyObject[3])+web3.toUtf8(policyObject[4]),
        timeStamp               :   policyObject[5],
        policyOwnerStatus       :   policyOwnerStatus,
        policyProviders         :   policyProviderObject
    }

    response.send(policyDetails);
});





/**
 * 
 * API to get All Customer Policies
 * 
 * @function                    getAllCustomerPolicies
 * 
 * @returns     {JSONArray}     customerPolicies        -  all customer policies
 */

 /*
app.get('/getAllCustomerPolicies',function(request, response){
    logger.debug("****************** get all customer policies *********************");
    var policiesObject = deployedInsuranceContract['getTpaPolicies'](tpaAddress);
    var policies = [];
    for(var index = 0; index < policiesObject.length; index++){
        var policyId = policiesObject[index];

        var policyObject = deployedPolicyContract['getPolicy'](policyId, tpaAddress);
        logger.debug("printing policyObject : "+policyObject);
        var policyOwnerStatus = deployedInsuranceContract['getPolicyOwnersStatus'](policyId);

        var policyHolderAddress = policyObject[1];
        
        var policyHolderDetails = deployedPolicyContract['getCustomerDetails'](policyHolderAddress);
        
        var insuredAmount = policyHolderDetails[3];
        var customerName = policyHolderDetails[1];
        var customerAddress = policyHolderDetails[0];
        var policyDetails = {
            policyId                :   policyId,
            policyValidity          :   policyObject[2],
            policyDocumentHash      :   (web3.toUtf8(policyObject[3])+web3.toUtf8(policyObject[4])),
            timestamp               :   policyObject[5],
            sumInsured              :   insuredAmount,
            customerName            :   customerName,
            policyOwnerStatus       :   policyOwnerStatus,
            policyHolderAddress     :   customerAddress
        }

        policies.push(policyDetails);
    }
    response.send(policies.reverse());
});
*/

/**
 * 
 * API to get All Customer Policies
 * 
 * @function                    getAllCustomerPolicies
 * 
 * @returns     {JSONArray}     customerPolicies        -  all customer policies
 */

app.get('/getAllCustomerPolicies',function(request, response){
    logger.debug("****************** get all customer policies *********************");
    clientListDB.collection("clientlist").find().toArray(function(err, result) {
        if (err) throw err;
        logger.debug(result);
        return response.send(result.reverse());
    });
});

function syncClientList(){
    logger.debug("Syncing ClientList");
    logger.debug("****************** get all customer policies *********************");
    var policiesObject = deployedInsuranceContract['getTpaPolicies'](tpaAddress);
    var policies = [];
    for(var index = 0; index < policiesObject.length; index++){
        var policyId = policiesObject[index];
        var policyObject = deployedPolicyContract['getPolicy'](policyId, tpaAddress);
        logger.debug("printing policyObject : "+policyObject);
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
                  logger.debug("Record inserted/updated ..");
         });
    }
}

/*
setInterval(function(){
    logger.debug("*********************** starting clientList sync function **************************");
    syncClientList();

},11000);
*/

/**
 * 
 * API to get customer/policyHolder's dependents
 * @function                    getDependents
 * @param       {number}        policyId            -   policyId of the customer
 * @returns     {JSONArray}     dependentList       -   list of all dependents
 */
app.get('/getDependents',function(request, response){
    var policyId    =   request.query.policyId;
    logger.debug("******************** get dependents ********************************");

    var dependentsObject   = deployedPolicyContract['getDependents'](policyId);

    logger.debug("printing dependents list : "+dependentsObject);
    logger.debug("converting all list objects to utf8 ");
    var dependentList   =   [];
    var dependentObject ;

    for(var index=0; index < dependentsObject[0].length; index++){


        //get dependent details
        var dependentDetailsObject  =   deployedPolicyContract['getDependentDetails'](dependentsObject[1][index]);

        logger.debug("printing age : "+dependentDetailsObject[1]);
        logger.debug("printing gender : "+dependentDetailsObject[2]);

        dependentObject = {
            dependentName:web3.toUtf8(dependentsObject[0][index]),
            dependentId:dependentsObject[1][index],
            age:dependentDetailsObject[1],
            gender:web3.toUtf8(dependentDetailsObject[2]),
            relation:web3.toUtf8(dependentDetailsObject[3])
        }

        dependentList.push(dependentObject);
    }

    var jsonResponse = {
        dependents:dependentList
    }

    response.send(jsonResponse);
});




/**
 * API to get customer policies
 * 
 * @function                    getCustomerPolicies
 * @param       {string}        customerAddress     - walletAddress of the customer
 * @returns     {JSONObject}    customerPolicies    - list of policies taken customer
 * 
 */
app.get('/getCustomerPolicies',function(request, response){
    var customerAddress     =   request.query.customerAddress;

    logger.debug("************************ get customer policies **************************");
    var customerPoliciesObject = deployedPolicyContract['getCustomerPolicies'](customerAddress);
    logger.debug("printing customer policies : "+customerPoliciesObject);
    
    var policyList = [];

    for(var index=0; index < customerPoliciesObject[1].length; index++){
        var policyObject = deployedPolicyContract['getPolicy'](customerPoliciesObject[1][index], tpaAddress);
        logger.debug("printing policyObject : "+policyObject);
        var policyOwnerStatus = deployedInsuranceContract['getPolicyOwnersStatus'](policyId);

        var policyDetails = {
            policyId                :   customerPoliciesObject[1][index],
            policyValidity          :   policyObject[2],
            policyDocumentHash      :   (web3.toUtf8(policyObject[3])+web3.toUtf8(policyObject[4])),
            timestamp               :   policyObject[5],
            policyOwnerStatus       :   policyOwnerStatus
        }

        policyList.push(policyDetails);
    }

    var customerPolicies = {
        policies:policyList.reverse()
    }

    response.send(customerPolicies);
});





/**
 * API to get customer/policy holder details
 * 
 * @function                    getCustomerDetails
 * @param       {string}        customerAddress      -   wallet address of the customer
 * @returns     {JSONObject}    customerDetails      -   customerAddress, customerName, userName, sumInsured, tenure
 */
app.get('/getCustomerDetails',function(request, response){
    logger.debug("**************************** get customer details *********************************");

    var customerAddress     =   request.query.customerAddress;
    logger.debug("printing customer address : "+customerAddress);

    var customerObject = deployedPolicyContract['getCustomerDetails'](customerAddress);
    
    logger.debug("printing customer Object : "+customerObject);

    var userName = customerObject[2];

    var MongoClient = require('mongodb').MongoClient;
    var url = mongoUrl+"marsh";
    try{
        MongoClient.connect(url, function(err, db) {
            if (err) throw err;
            db.collection(userName).find().toArray(function(err, userObject) {
            if (err) throw err;
            logger.debug(userObject);
                    var customerDetails = {
                        "customerAddress":customerObject[0],
                        "customerName":customerObject[1],
                        "username":customerObject[2],
                        "sumInsured":customerObject[3],
                        "tenure":customerObject[4],
                        "emailId":customerObject[2],
                        "scheme":customerObject[5],
                        "dob":""
                    }
                    response.send(customerDetails);
            });
        });
    }catch(Exception){
        logger.debug("error in fetching data");
    }
});


/**
 * 
 * API to get All Customer Policies
 * 
 * @function                    getAllCustomerPolicies
 * 
 * @returns     {JSONArray}     customerPolicies        -  all customer policies
 */
/*
app.get('/getAllCustomerPolicies',function(request, response){
    logger.debug("****************** get all customer policies *********************");

    var policiesObject = deployedInsuranceContract['getTpaPolicies'](tpaAddress);
    var policies = [];
    for(var index = 0; index < policiesObject.length; index++){
        var policyId = policiesObject[index];

        var policyObject = deployedPolicyContract['getPolicy'](policyId, tpaAddress);
        logger.debug("printing policyObject : "+policyObject);
        var policyOwnerStatus = deployedInsuranceContract['getPolicyOwnersStatus'](policyId);

        var policyHolderAddress = policyObject[1];
        
        var policyHolderDetails = deployedPolicyContract['getCustomerDetails'](policyHolderAddress);
        
        var insuredAmount = policyHolderDetails[3];
        var customerName = policyHolderDetails[1];
        var policyDetails = {
            policyId                :   policyId,
            policyValidity          :   policyObject[2],
            policyDocumentHash      :   (web3.toUtf8(policyObject[3])+web3.toUtf8(policyObject[4])),
            timestamp               :   policyObject[5],
            sumInsured              :   insuredAmount,
            customerName            :   customerName,
            policyOwnerStatus       :   policyOwnerStatus,
            policyHolderAddress     :   policyHolderAddress
        }

        policies.push(policyDetails);
    }

    response.send(policies);
});
*/

/**
 * API to accept claim (initial claim approval)
 * 
 * @function                    acceptClaim
 * 
 * @param       {claimId}       claimId
 * @param       {policyId}      policyId
 * 
 * @returns     {JSONObject}    txId
 */
app.post('/acceptClaim', function (request, response) {
    logger.debug("************************ accept claim ********************************");

    try {
        var claimId = request.query.claimId;
        var policyId = request.query.policyId;

        var isError = false;

        if (isNaN(claimId)) {
            console.log(new Error("claimId is not a number"));
            isError = true;
        } else {
            if (isNaN(policyId)) {
                console.log(new Error("policyId is not a number"));
                isError = true;
            }
        }

        if (isError == false) {

            web3.personal.unlockAccount(tpaAddress, tpaWalletPassword);

            var txId = deployedClaimContract['initialClaimApproval'](claimId, policyId, tpaAddress, insuranceContractAddress, {
                from: tpaAddress,
                gas: 4000000
            });
            var jsonResponse = {
                txId: txId
            }

            response.send(jsonResponse);
        } else {
            response.send({
                "error": "Error in acceptClaim"
            });
        }
    } catch (e) {
        logger.error("Error in acceptClaim");
    }
});


/**
 * API for final approval of claim
 * 
 * @function                    approveClaim
 * @param       {claimId}       claimId         -   claimId of the patient
 * @returns     {JSONObject}    txId            -   txId
 */
app.post('/approveClaim', function (request, response) {

    try {
        logger.debug("************************ approve claim ****************************");
        var claimId = request.query.claimId;

        var isError = false;

        if (isNaN(claimId)) {
            console.log(new Error("claimId is not a number"));
            isError = true;
        }

        if (isError == false) {

            web3.personal.unlockAccount(tpaAddress, tpaWalletPassword);

            var txId = deployedClaimContract['finalClaimApproval'](claimId, tpaAddress, {
                from: tpaAddress,
                gas: 4000000
            });
            var jsonResponse = {
                txId: txId
            }
            response.send(jsonResponse);
        } else {
            response.send({
                "error": "Error in approveClaim"
            });
        }
    } catch (e) {
        logger.error("Error in approveClaim");
    }
});



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
    logger.debug("******************* get claim list for TPA ********************");
    
    var claimListObject = deployedInsuranceContract['getTpaClaims'](tpaAddress);
    logger.debug("printing claimList for tpa "+JSON.stringify(claimListObject));
    var claimList=[];

    for(var index = 0; index < claimListObject.length; index++){
        var claimId = claimListObject[index];
        var initialClaimObject = deployedClaimContract['getInitialClaimDetails'](claimId);
        //logger.debug("printing initial claim details : "+initialClaimObject);
        var claimDetailsObject = deployedClaimContract['getClaimDetails'](claimId);
        var policyId = initialClaimObject[1];
        //get customerName and patientName
        var policyObject   = deployedPolicyContract['getPolicy'](policyId, marshAddress);
        var customerAddress = policyObject[1];
        var customerObject = deployedPolicyContract['getCustomerDetails'](customerAddress);
        var customerName = customerObject[1];
        var patientObject = deployedHospitalContract['getPatientDetails'](initialClaimObject[0]);

        //logger.debug("printing patientObject  : "+JSON.stringify(patientObject));
        var patientName = patientObject[2];

        var approverName = web3.toUtf8(deployedInsuranceContract['getCompanyName'](initialClaimObject[6]));

        var initialClaimDetails = {
            claimId:claimId,
            policyHolderName:customerName,
            patientName:patientName,
            claimStatus:web3.toUtf8(claimDetailsObject[0]),
            patientAddress:initialClaimObject[0],
            policyId:initialClaimObject[1],
            timestamp:initialClaimObject[2],
            claimEstimate:initialClaimObject[3],
            estimateDocument:web3.toUtf8(initialClaimObject[4])+web3.toUtf8(initialClaimObject[5]),
            initiallyApprovedBy:initialClaimObject[6],
            approverName:approverName
        }
	//logger.debug("initial Claim Details : "+initialClaimDetails);
        claimList.push(initialClaimDetails);
    }
    response.send(claimList.reverse());
    
 });
*/


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
app.get('/getClaimListForTPA',function(request, response){
    logger.debug("**************** Get Claim Request List ******************");
    claimListDB.collection("claimlist").find().toArray(function(err, result) {
        if (err) throw err;
        logger.debug(result);
        return response.send(result.reverse());
      });
});


function syncClaimList(){
    logger.debug("**************** Syncing claim list for TPA *******************");
    logger.debug("******************* get claim list for TPA ********************");
    
    var claimListObject = deployedInsuranceContract['getTpaClaims'](tpaAddress);
    logger.debug("printing claimList for tpa "+JSON.stringify(claimListObject));
    var claimList=[];

    for(var index = 0; index < claimListObject.length; index++){
        var claimId = claimListObject[index];
        var initialClaimObject = deployedClaimContract['getInitialClaimDetails'](claimId);
        //logger.debug("printing initial claim details : "+initialClaimObject);
        var claimDetailsObject = deployedClaimContract['getClaimDetails'](claimId);
        var policyId = initialClaimObject[1];
        //get customerName and patientName
        var policyObject   = deployedPolicyContract['getPolicy'](policyId, marshAddress);
        var customerAddress = policyObject[1];
        var customerObject = deployedPolicyContract['getCustomerDetails'](customerAddress);
        var customerName = customerObject[1];
        var patientObject = deployedHospitalContract['getPatientDetails'](initialClaimObject[0]);

        //logger.debug("printing patientObject  : "+JSON.stringify(patientObject));
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
                 logger.debug("Record inserted/updated ..");
        })

}
}

/*
setInterval(function(){
    logger.debug("*************** starting syncClaimList **************");
    syncClaimList();
},10000);
*/


/**
 * API to get initial claimDetails
 * 
 * @function                    getInititalClaimDetails 
 * @param       {number}        claimId                     - claimId of the patient
 * 
 * @returns     {JSONObject}    initialClaimDetails         - initital claim details of the customer
 */
app.get('/getInitialClaimDetails',function(request, response){
    logger.debug("************************** initial claim details *********************************");
    var claimId = request.query.claimId;
    //fetch data from blockchain
    var initialClaimObject = deployedClaimContract['getInitialClaimDetails'](claimId);
    logger.debug("printing initial claim details : "+initialClaimObject);
    var initialClaimDetails = {
        patientAddress:initialClaimObject[0],
        policyId:initialClaimObject[1],
        timestamp:initialClaimObject[2],
        claimEstimate:initialClaimObject[3],
        estimateDocument:web3.toUtf8(initialClaimObject[4])+web3.toUtf8(initialClaimObject[5]),
        initiallyApprovedBy:initialClaimObject[6]
    }

    response.send(initialClaimDetails);
});



/**
 * 
 * API to get claim details
 * 
 * @function                        getClaimDetails
 * @param           {number}        claimId                 - claimId of the patient
 * @returns         {JSONObject}    claimDetails            - claim details of the patient
 */

app.get('/getClaimDetails', function(request, response){
    logger.debug("**************************** get claim details of the patient **********************");
    var claimId = request.query.claimId;
    var claimDetailsObject = deployedClaimContract['getClaimDetails'](claimId);
    var claimOwnersObject = deployedClaimContract['getClaimOwners'](claimId);

    logger.debug("printing claim details : "+JSON.stringify(claimDetailsObject));
    logger.debug("printing owner details : "+JSON.stringify(claimOwnersObject));

    /*
    var claimDetails = {
        claimStatus: web3.toUtf8(claimDetailsObject[0]),
        bill:(web3.toUtf8(claimDetailsObject[1][0])+web3.toUtf8(claimDetailsObject[2][0])),
        claimAmount:claimDetailsObject[3],
        brokerAddress:claimOwnersObject[0],
        insuranceAddress:claimOwnersObject[1],
        tpaAddress:claimOwnersObject[2]
    }
    */

    var bill;
    logger.debug("printing length "+claimDetailsObject[1]);
    if(claimDetailsObject[1] == 0){
        bill = "notFound"
    }else{
        bill = (web3.toUtf8(claimDetailsObject[1][0])+web3.toUtf8(claimDetailsObject[2][0]));
    }


    var claimDetails = {
        claimStatus: web3.toUtf8(claimDetailsObject[0]),
        bill:bill,
        claimAmount:claimDetailsObject[3],
        brokerAddress:claimOwnersObject[0],
        insuranceAddress:claimOwnersObject[1],
        tpaAddress:claimOwnersObject[2]
    }
    logger.debug("printing claim details : "+claimDetails);
    response.send(claimDetails);
});




/***************************************** database API starts here *************************/




/**
 * 
 * function to store tpa transactions
 * 
 * @function                            storeTPATransactions
 * 
 */


function storeTPATransactions(companyName, tx_id, description, accountAddress, policyId){

    try{
    logger.debug("****************** storing transactions for TPA *******************");

    // storing transaction record for a customer into mongodb 
    // collection is by user_name i.e it can be any emailId( but it is unique)
    logger.debug("***************** store transactions to database *******************");

    /*
        var isError = false;

        if(isNaN(policyId)){
            console.log(new Error("policyId is not a number"));
            isError = true;
        }

        if(isError == false){
    */
        var date_time;
    
        // get blocktimestamp by fetching blockdata
        logger.debug("printing tx_id"+tx_id);
        logger.debug("fetching transaction data  ");
        var transactionData = web3.eth.getTransaction(tx_id);
    
        logger.debug(transactionData);
    
        logger.debug("fetching block data  ");
        var blockNumber = transactionData.blockNumber;
    
        var blockData   =    web3.eth.getBlock(blockNumber);
        logger.debug("fetching block timestamp  ");
        date_time = blockData.timestamp;
    
        logger.debug("printing block timestamp   "+date_time);

            let promiseA = new Promise((resolve, reject) => {
                let wait = setTimeout(() => {
                  
                        logger.debug("************ connected to mongodb client at localhost *************");
                        logger.debug("********** storing record **********");
                        var myobj = { transactionId: tx_id, dateTime: date_time, description: description,  policyId: policyId};
                  
                          var collectionName = companyName+"txns";
                          tpaTxnsDB.collection(collectionName).insertOne(myobj, function(err, res) {
                              if (err) throw err;
                              logger.debug("Transaction record inserted ....");
                          });
                }, 3000)
            });
            /*
        }else{
            console.log("Error in storeTPATransactions");
        }
        */
        }catch(e){
            logger.error("Error in storeTPATransactions");
        }
}



/**
 * 
 * function to store customer transactions
 * @function                                storeCustomerTransaction
 * @param           {string}                user_name
 * @param           {string}                tx_id
 * @param           {string}                description
 * @param           {string}                accountAddress
 * @param           {number}                policyId              
 * 
 */
function storeCustomerTransaction(user_name, tx_id, description, accountAddress, policyId) {
    // storing transaction record for a customer into mongodb
    // collection is by user_name i.e it can be any emailId( but it is unique)

    try {
        logger.debug("***************** store transactions to database *******************");

        /*
        var isError = false;
        if (isNaN(policyId)) {
            console.log(new Error("policyId is not a number"));
            isError = true;
        }
        */
       // if (isError == false) {

            var date_time;

            // get blocktimestamp by fetching blockdata
            logger.debug("printing tx_id" + tx_id);
            logger.debug("fetching transaction data  ");
            var transactionData = web3.eth.getTransaction(tx_id);

            logger.debug(transactionData);

            logger.debug("fetching block data  ");
            var blockNumber = transactionData.blockNumber;

            var blockData = web3.eth.getBlock(blockNumber);
            logger.debug("fetching block timestamp  ");
            date_time = blockData.timestamp;

            logger.debug("printing block timestamp   " + date_time);

            // get name of the customer
            var customerName;

            logger.debug("printing account address : " + accountAddress);

            var result = (deployedPolicyContract['getCustomerDetails'](accountAddress));
            logger.debug("printing customer details : " + result);
            customerName = result[1];

            logger.debug("printing customerName : " + customerName);

            let promiseA = new Promise((resolve, reject) => {
                let wait = setTimeout(() => {

                    logger.debug("************ connected to mongodb client at localhost *************");
                    logger.debug("********** storing record **********");
                    var myobj = {
                        transactionId: tx_id,
                        dateTime: date_time,
                        description: description,
                        customerName: customerName,
                        policyId: policyId
                    };

                    var collectionName = user_name + "txns";
                    tpaCustomerTxnsDB.collection(collectionName).insertOne(myobj, function (err, res) {
                        if (err) throw err;
                        logger.debug("Transaction record inserted ....");
                    });
                });
            }, 3000);
        //}
    } catch (e) {
        logger.error("storeCustomerTransactions");
    }
}






/**
 * Get Customer Transactions By PolicyId
 * @function                getCustomerTransactionsByPolicyId
 * @param       {string}    userName            - userName of the customer
 * @param       {number}    policyId            - policyId of the customer
 * @returns     {JSONArray} transactionList     - list of customer transactions by loanId 
 */
app.get('/getCustomerTransactionsByPolicyId',function(request, response){
    logger.debug("******************** get transactions for customer by policyId ****************");
    var userName = request.query.userName;
    var policyId   = parseInt(request.query.policyId);
    logger.debug("userName is "+userName);
    logger.debug("loan id is "+policyId);

    var collectionsName = userName+"txns"
    logger.debug("printing collections name "+collectionsName);
      var query = {policyId:policyId};
      tpaCustomerTxnsDB.collection(collectionsName).find(query).toArray(function(err, transactionList) {
        if (err) throw err;
        logger.debug(transactionList);
        return response.send(transactionList.reverse());
      });
});


/**
 * Get All Customer Transactions
 * @function                getAllCustomerTransactions
 * @returns     {JSONArray} allTransactions             - list of all customer transactions
 * 
 */
app.get('/getAllCustomerTransactions',function(request, response){
    logger.debug("*********************** get all customer transactions *************************");
        var allTransactions = [];
        tpaCustomerTxnsDB.listCollections().toArray(function(err, result) {
          if (err) throw err;
          logger.debug(result);
          //db.close();
          for(var index=0; index<result.length; index++){
            
              var collectionsName = result[index].name;
              //logger.debug("printing collections name"+collectionsName);
              tpaCustomerTxnsDB.collection(collectionsName).find({}).toArray(function(err, record) {
                    if (err) throw err;
                    allTransactions.push(record.reverse());
                    
                });
            }

            let promiseA = new Promise((resolve, reject) => {
                let wait = setTimeout(() => {
                response.setHeader('Content-Type', 'application/json');
                response.send(allTransactions);
                }, 3000)
            })
      });
});

/**
 * updateClaimRecord update claim status
 * @param {*} claimId 
 * @param {*} claimStatus 
 */
function updateClaimRecord(claimId, claimStatus) {
    //update claim record
    logger.info("updateClaimRecord");

    try {

        var isError = false;

        if (isNaN(claimId)) {
            console.log(new Error("claimId is not a number"));
            isError = true;
        }

        if (isError == false) {
            var query = {
                claimId: claimId.toNumber()
            };

            var initialClaimObject = deployedClaimContract['getInitialClaimDetails'](claimId);
            var initiallyApprovedBy = initialClaimObject[6];
            var approverName = deployedInsuranceContract['getCompanyName'](initialClaimObject[6]);

            var newValues = {
                $set: {
                    claimStatus: web3.toUtf8(claimStatus),
                    initiallyApprovedBy: initiallyApprovedBy,
                    approverName: web3.toUtf8(approverName)
                }
            }

            claimListDB.collection("claimlist").updateOne(query, newValues, function (err, doc) {
                if (err) throw err;
                logger.debug("claimlist_db updated ..");
            });
        } else {
            console.log("Error in updateClaimRecord");
        }
    } catch (e) {
        logger.error("Error in updateClaimRecord");
    }
}


/*
function updateApproverInfo(claimId) {
    //method to update initial approver info
    //update approver name and approver address
    //
    logger.info("updateApproverInfo");
    logger.debug("claimId : " + claimId);

    var initialClaimObject = deployedClaimContract['getInitialClaimDetails'](claimId);
    initiallyApprovedBy = initialClaimObject[6];
    var approverName = deployedInsuranceContract['getCompanyName'](initialClaimObject[6]);

    var query = { claimId: claimId.toNumber() };
    var newValues = {
        $set: {
            initiallyApprovedBy: initiallyApprovedBy,
            approverName: approverName
        }
    }

    claimListDB.collection("claimlist").updateOne(query, newValues, function (err, doc) {
        if (err) throw err;
        logger.debug("claimlist_db updated ..");
    });

}
*/

/**
 * updateEstimateDocument add ipfs hash
 * @param {*} claimId 
 */
function updateEstimateDocument(claimId) {
    //method to update claimlist_db
    //Just update estimateDocument key in the record
    //search the record by claimid
    logger.info("updateEstimateDocument");

    try {

        var isError = false;

        if (isNaN(claimId)) {
            console.log(new Error("claimId is not a number"));
            isError = true;
        }

        if (isError == false) {

            logger.debug("claimId : " + claimId);

            var query = {
                claimId: claimId.toNumber()
            };
            var initialClaimObject = deployedClaimContract['getInitialClaimDetails'](claimId);
            estimateDocument = web3.toUtf8(initialClaimObject[4]) + web3.toUtf8(initialClaimObject[5]);

            var newValues = {
                $set: {
                    estimateDocument: estimateDocument
                }
            }

            claimListDB.collection("claimlist").updateOne(query, newValues, function (err, doc) {
                if (err) throw err;
                logger.debug("claimlist_db updated ..");
            });
        } else {
            console.log("Error in updateEstimateDocument");
        }
    } catch (e) {
        logger.error("Error in updateEstimateDocument");
    }
}


/**
 * insertClaimRecord insert claim record after claim initiation
 * @param {*} claimId
 */
function insertClaimRecord(claimId) {
    logger.info("insertClaimRecord");
    try {

        var isError = false;

        if (isNaN(claimId)) {
            console.log(new Error("claimId is not a number"));
            isError = true;
        }

        if (isError == false) {

            var initialClaimObject = deployedClaimContract['getInitialClaimDetails'](claimId);
            logger.debug("printing initial claim details : " + initialClaimObject);
            var claimDetailsObject = deployedClaimContract['getClaimDetails'](claimId);
            var policyId = initialClaimObject[1];
            //get customerName and patientName
            var policyObject = deployedPolicyContract['getPolicy'](policyId, marshAddress);
            var customerAddress = policyObject[1];
            var customerObject = deployedPolicyContract['getCustomerDetails'](customerAddress);
            var customerName = customerObject[1];
            var patientObject = deployedHospitalContract['getPatientDetails'](initialClaimObject[0]);
            var approverName = deployedInsuranceContract['getCompanyName'](initialClaimObject[6]);
            logger.debug("printing patientObject  : " + JSON.stringify(patientObject));
            var patientName = patientObject[2];

            var initialClaimDetails = {
                claimId: claimId.toNumber(),
                policyHolderName: customerName,
                patientName: patientName,
                claimStatus: web3.toUtf8(claimDetailsObject[0]),
                patientAddress: initialClaimObject[0],
                policyId: initialClaimObject[1].toNumber(),
                timestamp: initialClaimObject[2].toNumber(),
                claimEstimate: initialClaimObject[3].toNumber(),
                estimateDocument: web3.toUtf8(initialClaimObject[4]) + web3.toUtf8(initialClaimObject[5]),
                initiallyApprovedBy: initialClaimObject[6],
                approverName: web3.toUtf8(approverName)
            }

            //push the object into mongodb 
            var query = {
                claimId: claimId.toNumber()
            };
            var obj = initialClaimDetails;
            claimListDB.collection("claimlist").update(query, obj, {
                upsert: true
            }, function (err, doc) {
                if (err) throw err;
                logger.debug("Record inserted/updated ..");
            });
        } else {
            console.log("Error in insertClaimRecord");
        }
    } catch (e) {
        logger.error("Error : " + e);
    }
}


/**
 * 
 * @param {*} policyId 
 */
function insertCustomerPolicyRecord(policyId) {
    logger.info("insert customer policy record");

    try {

        var isError = false;

        if (isNaN(policyId)) {
            console.log(new Error("policyId is not a number"));
            isError = true;
        }

        if (isError == false) {

            var policyObject = deployedPolicyContract['getPolicy'](policyId, tpaAddress);
            console.log("printing policyObject : " + policyObject);
            var policyOwnerStatus = deployedInsuranceContract['getPolicyOwnersStatus'](policyId);
            var policyHolderAddress = policyObject[1];
            var policyHolderDetails = deployedPolicyContract['getCustomerDetails'](policyHolderAddress);
            var insuredAmount = policyHolderDetails[3];
            var customerName = policyHolderDetails[1];
            var customerAddress = policyHolderDetails[0];
            var policyDetails = {
                policyId: policyId.toNumber(),
                policyValidity: policyObject[2].toNumber(),
                policyDocumentHash: (web3.toUtf8(policyObject[3]) + web3.toUtf8(policyObject[4])),
                timestamp: policyObject[5].toNumber(),
                sumInsured: insuredAmount.toNumber(),
                customerName: customerName,
                policyOwnerStatus: policyOwnerStatus,
                policyHolderAddress: customerAddress
            }

            //push the object into mongodb 
            var query = {
                policyId: policyId.toNumber()
            };
            var obj = policyDetails;
            clientListDB.collection("clientlist").update(query, obj, {
                upsert: true
            }, function (err, doc) {
                if (err) throw err;
                console.log("Updated clientListDB ..");
            });
        } else {
            console.log("Error in insertCustomerPolicyRecord");
        }
    } catch (e) {
        logger.error("Error in insertCustomerPolicyRecord");
    }
}

/**
 * 
 * API to get file from ipfs
 * 
 */
app.get('/ipfs', function (req, res) {
    logger.info("ipfs");
    var fileHash = req.query.fileHash;

    //create and ipfs url and return
    logger.debug("fileHash : "+fileHash);

    /*
    ipfs.files.cat(fileHash, function (err, file) {
        if (err) throw err;
        res.send(file);
    });
    */
   res.send({
        ipfsUrl : "http://"+ipfsIpAddress+":8080/ipfs/"+fileHash
    });
});



/**
 * display index.html
 */
//assuming app is express Object.
app.get('/index',function(req,res){
	res.sendFile(path.join(__dirname+'/UI/index.html'));
});
app.use('/', function (req, res) {
    res.header("Access-Control-Allow-Origin", "*");
    res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
    res.header('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE');
    var message ={
        message:"API service for Marsh on Quorum"
    }
    res.send(message);
})

// ************** app runs at 0.0.0.0 at port 5000 *****************************
app.listen(appPort, appIp,function () {
    logger.debug("Application  listening at "+appIp+"Port : "+appPort);
});
