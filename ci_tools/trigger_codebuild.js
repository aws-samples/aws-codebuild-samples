'use strict';

const AWS = require('aws-sdk');
const codebuild = new AWS.CodeBuild();

const codebuildProject = process.env.projectName;
const codebuildBuildspec = process.env.buildspec;

exports.handler = (event, context, callback) => {
  try {
    var params = {
      projectName: codebuildProject
    };

    if (event.project) {
      params.projectName = event.project;
    } else if (event.details && event.details.project) {
      params.projectName = event.details.project;
    }

    if (event.buildspec) {
      params.buildspecOverride = event.buildspec;
    } else if (event.details && events.details.buildspec) {
      params.buildspecOverride = event.details.buildspec;
    } else if (codebuildBuildspec) {
      params.buildspecOverride = codebuildBuildspec;
    }

    if (event.source &&
        event.source == "aws.codecommit" &&
        event.detail.commitId) {
      params.sourceVersion = event.detail.commitId;
    }

    codebuild.startBuild(params, (error, data) => {
      if (error) {
        console.log(error, error.stack);
        return callback(error);
      }

      console.log(data);
      return callback(null, data);
    });
  } catch (error) {
    console.log('Caught Error: ', error);
    callback(error);
  }
};
