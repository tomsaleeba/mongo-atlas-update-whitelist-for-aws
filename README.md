Updates your MongoDB Atlas [IP whitelist](https://docs.atlas.mongodb.com/security-whitelist/index.html) using the published [IP ranges](https://docs.aws.amazon.com/general/latest/gr/aws-ip-ranges.html) for AWS Services. This makes it easy to `allow` a whole region so, for example, a Lambda function on any EC2 instance in that region will be able to reach your database. This was built for this exact use case and when you cannot use [VPC with EC2 NAT](https://forums.aws.amazon.com/message.jspa?messageID=679504) to give your Lambda a predicatable IP.

# Install
```bash
git clone https://github.com/tomsaleeba/mongo-atlas-update-whitelist-for-aws
cd mongo-atlas-update-whitelist-for-aws
yarn
./index.js help
```

# Running
 1. As a pre-requisite, you need to have an API key for MongoDB Atlas. Follow [these instructions](https://docs.atlas.mongodb.com/configure-api-access/) to get one.
 1. We need to get the ID of the group we want to update:
      ```console
      $ ./index.js list-groups \
        --user=user@example.com \
        --key=4c03c17c-25d8-42fa-a762-bd9c22b5a55a
      # examp
      Listing MongoDB Atlas groups (AKA projects)
      Available groups:
        1ab2bf4c3b53b9822afa9364: Project 1
      ```
  1. Now we perform the update to the whitelist for that project:
      ```bash
      $ ./index.js update-whitelist \
        --region=ap-southeast-2 \
        --groupid=1ab2bf4c3b53b9822afa9364 \
        --user=user@example.com \
        --key=4c03c17c-25d8-42fa-a762-bd9c22b5a55a
      ```
Note: the default service to get IPs for is `EC2`, if you wish to target a different service, supply the `--service` param:
```bash
./index.js update-whitelist \
  --service=AMAZON \
  ... # continue with other params
```

## TODO
 1. make `delete` function that can remove all entries for a region
 1. lots more validation
