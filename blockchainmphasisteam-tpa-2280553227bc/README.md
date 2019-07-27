# TPA

TPA API for claims management POC.

# How to run tpa API at local system?

## Prerequisites

> Claims network up and running.

> Broker API up and running (https://mphasisblockchain@bitbucket.org/blockchainmphasisteam/broker.git).

> Mongodb

> IPFS at mbroker (port 5001 exposed)

### Clone tpa repo

```
$ git clone https://mphasisblockchain@bitbucket.org/blockchainmphasisteam/tpa.git
```

## Setup

```
$ cd tpa
```


> NOTE : give ip address of mbroker as parameter to initInsuranceMultiNode.sh.

```
$ initTpaMultiNode.sh {mbrokerAddress}
```

## Start the API

```
$ node app.js
```