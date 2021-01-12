# How to launch tests

 - dashboard should be deployed

 - set the ```TEST_BASE_URL``` env variable ```export TEST_BASE_URL=<dashboard url>```, 
 if dashboard URL is ```http://localhost:3000``` this action may be scipped
 
 - set the ```TEST_USERNAME``` and the ```TEST_PASSWORD``` env variables by credentials for accessing
 to the che.openshift.io

 - perform command ```npm install```

 - perform command ```npm run test```
