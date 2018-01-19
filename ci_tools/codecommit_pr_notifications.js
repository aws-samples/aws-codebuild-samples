'use strict';

const AWS = require('aws-sdk');
const codebuild = new AWS.CodeBuild();
const codecommit = new AWS.CodeCommit();
const cloudwatchlogs = new AWS.CloudWatchLogs();
const defaultCodebuildProject = process.env.projectName;

function startBuild(params, callback) {
  codebuild.startBuild(params, (error, data) => {
    if (error) {
      console.log(error, error.stack);
      return callback(error);
    }

    console.log(data);
    return callback(null, data);
  });
}

function postComment(params, callback) {
  console.log(params.content);
  codecommit.postCommentForPullRequest(params, (error, data) => {
    if (error) {
      console.log(error, error.stack);
      return callback(error);
    }

    console.log(data);
    return callback(null, data);
  });
}

function handlePullRequestEvent(event, callback) {
  // Start a build if this is a notification about a pull request update
  const eventType = event.detail.event;
  if (eventType == "pullRequestCreated" || eventType == "pullRequestSourceBranchUpdated") {
    const pullRequestId = event.detail.pullRequestId;
    // TODO Replace this line with your own logic for how to map CodeCommit repos to CodeBuild projects
    const projectName = defaultCodebuildProject;

    var params = {
      projectName: projectName,
      sourceVersion: event.detail.sourceCommit,
      // We will use the pull request env variables later to post a comment about the build to the PR
      environmentVariablesOverride: [
        {
          name: "CODECOMMIT_PULL_REQUEST_ID",
          value: event.detail.pullRequestId,
          type: "PLAINTEXT"
        },
        {
          name: "CODECOMMIT_PULL_REQUEST_SRC_COMMIT",
          value: event.detail.sourceCommit,
          type: "PLAINTEXT"
        },
        {
          name: "CODECOMMIT_PULL_REQUEST_DST_COMMIT",
          value: event.detail.destinationCommit,
          type: "PLAINTEXT"
        }
      ]
    };
    startBuild(params, callback);
  } else {
    callback("Not a buildable pull request update");
  }
}

function handleBuildEvent(event, callback) {
  // Parse a CodeBuild event notification,
  // and post a comment to a CodeCommit pull request
  // about the status of the build

  // Check that this build was triggered from a CodeCommit pull request
  const buildVariables = event.detail['additional-information'].environment['environment-variables'];
  const pullRequestIdEnvVar = buildVariables.find(function(buildEnvVar) {
    return buildEnvVar.name == "CODECOMMIT_PULL_REQUEST_ID";
  });
  const sourceCommitEnvVar = buildVariables.find(function(buildEnvVar) {
    return buildEnvVar.name == "CODECOMMIT_PULL_REQUEST_SRC_COMMIT";
  });
  const destinationCommitEnvVar = buildVariables.find(function(buildEnvVar) {
    return buildEnvVar.name == "CODECOMMIT_PULL_REQUEST_DST_COMMIT";
  });

  if (pullRequestIdEnvVar && sourceCommitEnvVar && destinationCommitEnvVar) {
    const buildArn = event.detail['build-id'];
    const buildId = buildArn.split('/').pop();
    const buildUuid = buildId.split(':').pop();
    const sourceUrl = event.detail['additional-information'].source.location;
    const repoName = sourceUrl.split('/').pop();
    const projectName = event.detail['project-name'];
    const buildStatus = event.detail['build-status'];
    const region = event.region;
    // Only comment once per build and build status
    const requestToken = buildArn + buildStatus;

    // Construct a comment based on build status
    var comment = `Build ${buildUuid} for project ${projectName} `;

    switch (buildStatus) {
    case 'IN_PROGRESS':
      comment += "is **in progress**.";
      break;
    case 'SUCCEEDED':
      comment += "**succeeded!**";
      break;
    case 'STOPPED':
      comment += "was **canceled**.";
      break;
    case 'TIMED_OUT':
      comment += "**timed out**.";
      break;
    default:
      comment += "**failed**."
    }

    comment += ` Visit the [AWS CodeBuild console](https:\/\/${region}.console.aws.amazon.com\/codebuild\/home?` +
               `region=${region}#\/builds\/${encodeURI(buildId)}\/view\/new) to view the build details.`;

    var pullRequestParams = {
      repositoryName: repoName,
      pullRequestId: pullRequestIdEnvVar.value,
      beforeCommitId: destinationCommitEnvVar.value,
      afterCommitId: sourceCommitEnvVar.value,
      content: comment,
      clientRequestToken: requestToken
    };

    // Add build logs snippet to the comment
    if (buildStatus != 'IN_PROGRESS' &&
        buildStatus != 'SUCCEEDED' &&
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
          // an error occurred, ignore and post the comment without the logs
          console.log(err, err.stack);
        } else {
          var logLines = data.events.map(function(event) {
            return event.message;
          }).join("");
          pullRequestParams.content += "\n```\n" + logLines + "\n```\n";
        }

        postComment(pullRequestParams, callback);
      });
    } else {
      postComment(pullRequestParams, callback);
    }
  } else {
    callback("Not a pull-request build");
  }
}

exports.handler = (event, context, callback) => {
  try {
    console.log(event);

    if (event.source && event.source == "aws.codebuild" &&
        event['detail-type'] == "CodeBuild Build State Change") {
      handleBuildEvent(event, callback);
    } else if (event.source && event.source == "aws.codecommit" &&
               event['detail-type'] == "CodeCommit Pull Request State Change") {
      handlePullRequestEvent(event, callback);
    } else {
      callback("Not a pull-request-related CodeCommit or CodeBuild event");
    }
  } catch (error) {
    console.log('Caught Error: ', error);
    callback(error);
  }
};
