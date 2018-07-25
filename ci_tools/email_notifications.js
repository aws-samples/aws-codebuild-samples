'use strict';

const AWS = require('aws-sdk');
const cloudwatchlogs = new AWS.CloudWatchLogs();
const ses = new AWS.SES({region: 'us-west-2'});
const sourceEmailAddress = process.env.sourceEmailAddress;
const destinationEmailAddress = process.env.destinationEmailAddress;

function sendBuildEmail(subject, htmlBody, textBody, callback) {
  console.log(subject);
  console.log(htmlBody);
  console.log(textBody);

  var emailParams = {
    Source: sourceEmailAddress,
    Destination: {
      ToAddresses: [destinationEmailAddress]
    },
    Message: {
      Body: {
        Text: {
          Data: textBody
        },
        Html: {
          Data: htmlBody
        }
      },
      Subject: {
        Data: subject
      }
    }
  };

  ses.sendEmail(emailParams, function(err, data){
    if(err) {
      return callback(err);
    } else {
      return callback(null, "Email sent");
    }
  });
}

function handleBuildEvent(event, callback) {
  const buildStatus = event.detail['build-status'];

  if (buildStatus != 'IN_PROGRESS') {
    const buildArn = event.detail['build-id'];
    const buildId = buildArn.split('/').pop();
    const buildUuid = buildId.split(':').pop();
    const projectName = event.detail['project-name'];
    const region = event.region;

    // Construct email content based on build status
    var subject = `Nightly ${projectName} build `;
    var htmlBody = `Build ${buildUuid} for project ${projectName} `;
    var textBody = htmlBody;

    switch (buildStatus) {
    case 'SUCCEEDED':
      subject += "succeeded";
      textBody += "succeeded";
      htmlBody += "<b>succeeded!</b>";
      break;
    case 'STOPPED':
      subject += "was canceled";
      textBody += "was canceled";
      htmlBody += "was <b>canceled</b>.";
      break;
    case 'TIMED_OUT':
      subject += "timed out";
      textBody += "timed out";
      htmlBody += "<b>timed out</b>.";
      break;
    default:
      subject += "failed";
      textBody += "failed";
      htmlBody += "<b>failed</b>.";
    }

    htmlBody += ` Visit the <a href=\"https:\/\/${region}.console.aws.amazon.com\/codebuild\/home?` +
               `region=${region}#\/builds\/${encodeURI(buildId)}\/view\/new\">AWS CodeBuild console</a> to view the build details.`;

    textBody += ` Visit the AWS CodeBuild console to view the build details: https:\/\/${region}.console.aws.amazon.com\/codebuild\/home?` +
               `region=${region}#\/builds\/${encodeURI(buildId)}\/view\/new`;

    // Add build logs snippet to the body
    if (buildStatus != 'SUCCEEDED' &&
        buildStatus != 'STOPPED' &&
        event.detail['additional-information'].logs &&
        event.detail['additional-information'].logs['stream-name'] &&
        event.detail['additional-information'].logs['group-name']) {

      var logParams = {
        logGroupName: event.detail['additional-information'].logs['group-name'],
        logStreamName: event.detail['additional-information'].logs['stream-name'],
        limit: 30,
        startFromHead: false
      };
      cloudwatchlogs.getLogEvents(logParams, function(err, data) {
        if (err) {
          // an error occurred, ignore and send the email without the logs
          console.log(err, err.stack);
        } else {
          var logLines = data.events.map(function(event) {
            return event.message;
          }).join("");
          htmlBody += "<br/><br/>Logs:<br/><br/><pre>" + logLines + "</pre><br/>";
          textBody += "\n\nLogs:\n\n" + logLines + "\n\n";
        }

        sendBuildEmail(subject, htmlBody, textBody, callback);
      });
    } else {
      sendBuildEmail(subject, htmlBody, textBody, callback);
    }
  } else {
    callback("Not a completed build");
  }
}

exports.handler = (event, context, callback) => {
  try {
    console.log(event);

    if (event.source && event.source == "aws.codebuild" &&
        event['detail-type'] == "CodeBuild Build State Change") {
      handleBuildEvent(event, callback);
    } else {
      callback("Not a CodeBuild event");
    }
  } catch (error) {
    console.log('Caught Error: ', error);
    callback(error);
  }
};
