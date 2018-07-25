'use strict';

const AWS = require('aws-sdk');
const url = require('url');
const https = require('https');

/*
This code is intended to be used in an AWS Lambda function triggered by an Amazon CloudWatch Event rule with CodeBuild as source. This was written for demo purposes, and is probably not production ready.

Follow these steps to configure the webhook in Slack:

    Navigate to https://<your-team-domain>.slack.com/apps
    Search for and select "Incoming WebHooks".
    Choose the default channel where messages will be sent and click "Add Incoming WebHooks Integration".
    Copy the webhook URL from the setup instructions and save it to an SSM Parameter Store SecureString parameter.

Paste the name of the ParameterStore parameter into an 'hookUrlParameter' environment variable for the Lambda function.

Give your function's role permission for the kms:Decrypt action.

Example:

{
    "Version": "2012-10-17",
    "Statement": [
        {
            "Sid": "Stmt1443036478000",
            "Effect": "Allow",
            "Action": [
                "kms:Decrypt"
            ],
            "Resource": [
                "<your KMS key ARN>"
            ]
        }
    ]
}
*/

const hookUrlParameter = process.env.hookUrlParameter;
let hookUrl;


function postMessage(message, callback) {
    const body = JSON.stringify(message);
    const options = url.parse(hookUrl);
    options.method = 'POST';
    options.headers = {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(body),
    };

    const postReq = https.request(options, (res) => {
        const chunks = [];
        res.setEncoding('utf8');
        res.on('data', (chunk) => chunks.push(chunk));
        res.on('end', () => {
            if (callback) {
                callback({
                    body: chunks.join(''),
                    statusCode: res.statusCode,
                    statusMessage: res.statusMessage,
                });
            }
        });
        return res;
    });

    postReq.write(body);
    postReq.end();
}

function processEvent(event, callback) {
    const buildArn = event.detail['build-id'];
    const buildId = buildArn.split('/').pop();
    const buildUuid = buildId.split(':').pop();
    const projectName = event.detail['project-name'];
    const buildStatus = event.detail['build-status'];
    const region = event.region;

    const slackMessage = {
        text: `Build ${buildUuid} for project ${projectName} has reached ${buildStatus} status. ` +
        `Visit the <https:\/\/${region}.console.aws.amazon.com\/codebuild\/home?region=${region}#\/builds\/${encodeURI(buildId)}\/view\/new|AWS console> to view details.`,
    };

    postMessage(slackMessage, (response) => {
        if (response.statusCode < 400) {
            console.info('Message posted successfully');
            callback(null);
        } else if (response.statusCode < 500) {
            console.error(`Error posting message to Slack API: ${response.statusCode} - ${response.statusMessage}`);
            callback(null);  // Don't retry because the error is due to a problem with the request
        } else {
            // Let Lambda retry
            callback(`Server error when processing message: ${response.statusCode} - ${response.statusMessage}`);
        }
    });
}

exports.handler = (event, context, callback) => {
    if (hookUrl) {
        // Container reuse, simply process the event with the key in memory
        processEvent(event, callback);
    } else if (hookUrlParameter) {
        const ssm = new AWS.SSM();
        const params = {
          Name: hookUrlParameter,
          WithDecryption: true
        };
        ssm.getParameter(params, (err, data) => {
            if (err) {
                console.log('Hook URL parameter error:', err);
                return callback(err);
            }
            hookUrl = data.Parameter.Value;
            processEvent(event, callback);
        });
    } else {
        callback('Hook URL parameter has not been set.');
    }
};
