## AWS CodeBuild Samples

Utilities and samples for building on CodeBuild

### Sample App: Simple Calculator Service

![CodeBuild badge](https://codebuild.us-west-2.amazonaws.com/badges?uuid=eyJlbmNyeXB0ZWREYXRhIjoieDJkVmY0VXl2bVRjaFdBYkRzZExTNS9ZTUZVQXE4Sy9GMkh1dk1sOE54VkJKcEowOGdXcnJiZDlGL1RGeXJGUmR5UHlWT1psaks2N1dKbk5qUSt6L1BnPSIsIml2UGFyYW1ldGVyU3BlYyI6InhST3ZVeEZ6bkxLWC9IZG4iLCJtYXRlcmlhbFNldFNlcmlhbCI6MX0%3D&branch=master)

Simple Node.js Express-based web service that demonstrates continuous integration with AWS CodeBuild, AWS CodeCommit, and GitHub, as well as continuous deployment with AWS CodeDeploy/CodePipeline.  This application was written for demo purposes only, and is definitely not production ready.

### CI Tooling (Buildspecs)

The buildspecs folder contains the following buildspec files for use with AWS CodeBuild:
* build.yml: Basic npm-based build with unit tests and code coverage report.
* shrinkwrap.yml: Upgrade npm dependencies and push an updated shrinkwrap file to source code repository.
* sonarqube.yml: Run static code analysis against a SonarQube endpoint, with the endpoint and token stored in SSM Parameter Store.
* build-test-suite-1.yml and build-test-suite-2.yml: Parallelize the unit tests into two separate projects.
* environment.yml: Build a Docker image with cached npm dependencies
* build-with-image-cache.yml: Use the cached npm dependencies from a custom Docker image.

### CI Tooling (Glue)

The ci_tools folder contains the following tools for use with AWS Lambda and Amazon CloudWatch Events to hook together the end-to-end CI process:
* trigger_codebuild.js: Lambda function to start a CodeBuild build.
* slack_notifications.js: Lambda function to post CodeBuild build notifications into a Slack channel.
* email_notifications.js: Lambda function to send CodeBuild build notification emails via Amazon SES.
* codecommit_pr_notifications: Lambda function to start a CodeBuild build for CodeCommit pull request notifications, and comment on a CodeCommit pull request for CodeCommit build notifications.
* cwe-rule-configuration/branch_ci.json: CloudWatch Events rule pattern to start a CodeBuild build for every push to the master branch of a CodeCommit repository.
* cwe-rule-configuration/slack_event_pattern.json: CloudWatch Events rule pattern to notify Slack for failed CodeBuild builds.
* cwe-rule-configuration/nightly_build_input.json: CloudWatch Events target input to start a CodeBuild build with a specific buildspec override and project name.

### CD Tooling

Contains an appspec.yml file and deploy_scripts folder for deploying the service with AWS CodeDeploy.

## CloudFormation Templates

Create a CodeCommit repository called 'aws-codebuild-samples' and push this sample code into the repo.  Then spin up all of the above easily with CloudFormation.

### Continuous Deployment
Set up continuous deployment with a CodePipeline pipeline:
```
aws cloudformation deploy --stack-name aws-codebuild-samples --template-file cloudformation/continuous-deployment.yml --capabilities CAPABILITY_NAMED_IAM

aws cloudformation describe-stacks --stack-name aws-codebuild-samples --query 'Stacks[0].Outputs[?OutputKey==`PipelineConsoleUrl`].OutputValue' --output text
```

Wait for the pipeline to finish deploying, then access the Test and Prod stack applications:
```
aws cloudformation describe-stacks --stack-name aws-codebuild-samples-test-stack --query 'Stacks[0].Outputs[?OutputKey==`Url`].OutputValue' --output text

aws cloudformation describe-stacks --stack-name aws-codebuild-samples-prod-stack --query 'Stacks[0].Outputs[?OutputKey==`Url`].OutputValue' --output text
```

### Continuous Integration: Nightly Checks

Choose an email address for receiving email notifications.  Then, [verify the email address in SES](https://us-west-2.console.aws.amazon.com/ses/home?region=us-west-2#verified-senders-email:) before setting up the CloudFormation stack.

```
mkdir build

S3_BUCKET=$(aws cloudformation describe-stacks --stack-name aws-codebuild-samples --query 'Stacks[0].Outputs[?OutputKey==`ArtifactsBucket`].OutputValue' --output text)

aws cloudformation package --template-file cloudformation/continuous-integration-nightly-checks.yml --s3-bucket $S3_BUCKET --force-upload --output-template-file build/continuous-integration-nightly-checks.yml

aws cloudformation deploy --stack-name aws-codebuild-samples-nightly-checks --template-file build/continuous-integration-nightly-checks.yml --capabilities CAPABILITY_NAMED_IAM --parameter-overrides NotificationEmailAddress="example@example.com"
```

### Continuous Integration: Branch Checks

Configure the webhook in Slack:
1. Navigate to https://<your-team-domain>.slack.com/apps
1. Search for and select "Incoming Webhooks".
1. Click "Add Configuration".
1. Choose a channel and click "Add Slash Command Integration".
1. Copy the Webhook URL from the integration settings.
1. Store the token in Parameter Store: `aws ssm put-parameter --name codebuild-samples-slack-webhook --type SecureString --value <webhook URL>` (Note: you will need to set `cli_follow_urlparam = false` in your AWS CLI config file first)

Then spin up the stack in CloudFormation:
```
mkdir build

S3_BUCKET=$(aws cloudformation describe-stacks --stack-name aws-codebuild-samples --query 'Stacks[0].Outputs[?OutputKey==`ArtifactsBucket`].OutputValue' --output text)

aws cloudformation package --template-file cloudformation/continuous-integration-branch-checks.yml --s3-bucket $S3_BUCKET --force-upload --output-template-file build/continuous-integration-branch-checks.yml

aws cloudformation deploy --stack-name aws-codebuild-samples-branch-checks --template-file build/continuous-integration-branch-checks.yml --capabilities CAPABILITY_NAMED_IAM
```

### Continuous Integration: Pull Request Checks

Spin up the stack in CloudFormation:
```
mkdir build

S3_BUCKET=$(aws cloudformation describe-stacks --stack-name aws-codebuild-samples --query 'Stacks[0].Outputs[?OutputKey==`ArtifactsBucket`].OutputValue' --output text)

aws cloudformation package --template-file cloudformation/continuous-integration-pull-request-checks.yml --s3-bucket $S3_BUCKET --force-upload --output-template-file build/continuous-integration-pull-request-checks.yml

aws cloudformation deploy --stack-name aws-codebuild-samples-pull-request-checks --template-file build/continuous-integration-pull-request-checks.yml --capabilities CAPABILITY_NAMED_IAM
```

## License

This library is licensed under the Apache 2.0 License.
