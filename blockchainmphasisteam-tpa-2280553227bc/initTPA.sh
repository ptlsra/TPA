#!/bin/bash

#ipAddress=$(ip route get 8.8.8.8 | awk '{print $NF; exit}')

#Sleep for 140 sec (Wait for broke API to come up)
#echo "Waiting for broker API to come up..."
#sleep 170

#ipAddress=$(ip route get 8.8.8.8 | awk '{print $7; exit}')
#get config data from main node and update contractConfig.json
ipAddress=$SYSTEM_IP
node getContractConfig.js $ipAddress |& tee -a /api-logs/tpa-api.log

node updateConfig.js $ipAddress 5001 $ipAddress 27017 8000 $ipAddress 25002 |& tee -a /api-logs/tpa-api.log
echo "config.js updated"

if [ -f "/data/contractConfig.json" ]
then
    echo "contractConfig.json found."
        
    echo "copying contractConfig.json to : `${pwd}`"
    cp /data/contractConfig.json .

    # register TPA
    node registerTPA.js |& tee -a /api-logs/tpa-api.log

    #Start API
    echo "Starting API"
    node app.js |& tee -a /api-logs/tpa-api.log
else

echo "contractConfig.json not found."

echo "dropping old databases"
node deleteDatabase.js |& tee -a /api-logs/tpa-api.log

# register TPA
node registerTPA.js |& tee -a /api-logs/tpa-api.log

# start app.js
echo "starting app.js"
node app.js |& tee -a /api-logs/tpa-api.log
fi