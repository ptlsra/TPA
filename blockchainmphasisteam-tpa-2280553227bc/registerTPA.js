// required modules
var fs = require("fs");
var Web3 = require('web3-quorum');
var cors = require('cors');
var log4js = require('log4js');
var logger = log4js.getLogger('app.js');

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

//Insurance.sol
var insuranceContractSource = fs.readFileSync("Insurance.json");
var insuranceContract = JSON.parse(insuranceContractSource)["contracts"];
var insuranceabi = JSON.parse(insuranceContract["Insurance.sol:Insurance"].abi);
const deployedInsuranceContract = web3.eth.contract(insuranceabi).at(String(insuranceContractAddress));



logger.info("registering TPA");
var tpaName  = "tpa";

var tpaObject = deployedInsuranceContract['getTPA'](tpaAddress);
var tpaNameTemp = web3.toUtf8(tpaObject[1]);

if(tpaNameTemp == ""){
    logger.info("TPA not registered. Registering TPA");

    web3.personal.unlockAccount(tpaAddress, tpaWalletPassword);

    var txId = deployedInsuranceContract['registerTPA'](tpaAddress, tpaName, {from: tpaAddress, gas:400000});

    var tpaInfo = {
    tpaAddress:tpaAddress,
    tpaName:tpaName,
    txId: txId
    }

    logger.debug("tpaInfo : "+JSON.stringify(tpaInfo));
}else{
    logger.info("TPA Already registered.");
}


