#!/bin/bash
set -e

# Expected env vars to fill in template. This trick is bash parameter expansion (http://wiki.bash-hackers.org/syntax/pe#display_error_if_null_or_unset)
: ${Z_CLUSTER_ARN:?} # e.g: arn:aws:ecs:ap-southeast-2:123456789123:cluster/oeh-fargate-cluster
: ${Z_ROLE_ARN:?} # e.g: arn:aws:iam::123456789123:role/ecsEventsRole
: ${Z_TASK_DEF_ARN:?} # e.g: arn:aws:ecs:ap-southeast-2:123456789123:task-definition/mongodb-backup-s3-task:1
: ${Z_SEC_GROUP:?} # e.g: sg-0cffbb75
: ${Z_SUBNET:?} # e.g: subnet-86d610de

tempFile=`mktemp`
cat << EOJSON > $tempFile
{
  "Rule": "mawaws-rule",
  "Targets": [
    {
      "Id": "thetask",
      "Arn": "$Z_CLUSTER_ARN",
      "RoleArn": "$Z_ROLE_ARN",
      "EcsParameters": {
        "TaskDefinitionArn": "$Z_TASK_DEF_ARN",
        "TaskCount": 1,
        "LaunchType": "FARGATE",
        "PlatformVersion": "1.3.0",
        "NetworkConfiguration": {
          "awsvpcConfiguration": {
            "Subnets": [
              "$Z_SUBNET"
            ],
            "SecurityGroups": [
              "$Z_SEC_GROUP"
            ],
            "AssignPublicIp": "ENABLED"
          }
        }
      }
    }
  ]
}
EOJSON

aws events put-targets \
  --cli-input-json file://$tempFile

rm $tempFile
