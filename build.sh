#!/bin/bash
#this script has to run after all other terraform actions have happened. 
#So the TF command to run it has to depend_on all the other actions

#first copy the terraform output to a creds file
cd terraform
terraform output -json > ../creds.json
cd ..

#copy creds to all the folders
cp creds.json cloudantConsumer/ 
cp creds.json redisConsumer/ 
cp creds.json producer/ 
cp creds.json web/

#make sure your account is targeting a resource group
ibmcloud target -g rg001 

#let docker access your ibm container registry
ibmcloud cr login

#go into each folder, build the docker images and push to container registry
cd cloudantConsumer
docker build -t cloudantconsumer .
docker tag cloudantconsumer uk.icr.io/trucktracker/cloudantconsumer:latest
docker push uk.icr.io/trucktracker/cloudantconsumer:latest 

cd ../redisConsumer
docker build -t redisconsumer .
docker tag redisconsumer uk.icr.io/trucktracker/redisconsumer:latest
docker push uk.icr.io/trucktracker/redisconsumer:latest 

cd ../producer
docker build -t producer .
docker tag producer uk.icr.io/trucktracker/producer:latest
docker push uk.icr.io/trucktracker/producer:latest 

cd ../web
docker build -t webserver .
docker tag webserver uk.icr.io/trucktracker/webserver:latest
docker push uk.icr.io/trucktracker/webserver:latest 
cd ..

#create a Code Engine project
ibmcloud ce project create --name trucktracker
ibmcloud ce project select -n trucktracker

#create the registry access key.. we need data from the creds file
CONTKEY_PASS=`cat creds.json | jq '.containerKey.value' | sed 's/"//g'`
ibmcloud ce registry create --name contkey --server uk.icr.io --password "${CONTKEY_PASS}"

#create a CE job for producers and consumers
ibmcloud ce job create --name cloudantconsumer --image uk.icr.io/trucktracker/cloudantconsumer --cpu 0.125 --memory 0.25G --registry-secret contkey
ibmcloud ce jobrun submit --job cloudantconsumer --name cloudantconsumer

ibmcloud ce job create --name redisconsumer --image uk.icr.io/trucktracker/redisconsumer --cpu 0.125 --memory 0.25G --registry-secret contkey
ibmcloud ce jobrun submit --job redisconsumer --name redisconsumer

ibmcloud ce job create --name producer --image uk.icr.io/trucktracker/producer --cpu 0.125 --memory 0.25G --registry-secret contkey
ibmcloud ce jobrun submit --job producer --name producer1 --argument LAToDallas.json --argument truck001
ibmcloud ce jobrun submit --job producer --name producer2 --argument boulderToNYC.json --argument truck002
ibmcloud ce jobrun submit --job producer --name producer3 --argument LAToDallas.json --argument truck003
ibmcloud ce jobrun submit --job producer --name producer4 --argument boulderToNYC.json --argument truck004

#create a CE app for webserver
ibmcloud ce application create --name webserver --image uk.icr.io/trucktracker/webserver --cpu 0.125 --memory 0.25G --registry-secret contkey

#print out the details to get the URL
ibmcloud ce application get --name webserver --output json | jq '.status.url'| sed 's/"//g'