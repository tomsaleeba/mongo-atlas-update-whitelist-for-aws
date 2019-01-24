#!/bin/bash
# creates a Task Definition in AWS ECS for this docker image
set -e

imageVersion=1.0.1
region=ap-southeast-2
# Expected env vars to fill in template. This trick is bash parameter expansion (http://wiki.bash-hackers.org/syntax/pe#display_error_if_null_or_unset)
: ${Z_EXECUTION_ROLE_ARN:?} # https://docs.aws.amazon.com/AmazonECS/latest/developerguide/task_execution_IAM_role.html, e.g: arn:aws:iam::123456789123:role/ecsTaskExecutionRole
: ${Z_LOG_GROUP_NAME:?}    # e.g: /ecs/mawaws
: ${Z_WHITELIST_REGION:?}  # AWS region you want to access Mongo, e.g: ap-southeast-2
: ${Z_WHITELIST_SERVICE:?} # AWS service you want to lookup IP ranges for, e.g: EC2
: ${Z_MONGO_GROUPID:?}     # Group ID (AKA project ID) for Mongo project to update whitelist for, e.g: 5a11b253df9db111b1afb1dd
: ${Z_MONGO_USER:?}        # Mongo user ID to connect to Mongo Atlas API as, probably your email address
: ${Z_MONGO_API_KEY:?}     # Mongo Atlas API key to use for connecting to the API, look like a GUID

tempFile=`mktemp`
cat << EOJSON > $tempFile
{
  "family": "mawaws",
  "networkMode": "awsvpc",
  "executionRoleArn": "$Z_EXECUTION_ROLE_ARN",
  "containerDefinitions": [
    {
      "name": "tomsaleeba_mawaws",
      "cpu": 0,
      "image": "tomsaleeba/mongo-atlas-update-whitelist-for-aws:$imageVersion",
      "logConfiguration": {
        "logDriver": "awslogs",
        "options": {
          "awslogs-group": "$Z_LOG_GROUP_NAME",
          "awslogs-stream-prefix": "ecs",
          "awslogs-region": "$region"
        }
      },
      "command": [
        "update-whitelist",
        "--region=$Z_WHITELIST_REGION",
        "--service=$Z_WHITELIST_SERVICE",
        "--groupid=$Z_MONGO_GROUPID",
        "--user=$Z_MONGO_USER",
        "--key=$Z_MONGO_API_KEY"
      ],
      "essential": true
    }
  ],
  "requiresCompatibilities": [
    "FARGATE"
  ],
  "cpu": "512",
  "memory": "1024"
}
EOJSON

aws ecs register-task-definition --cli-input-json file://$tempFile

rm $tempFile
