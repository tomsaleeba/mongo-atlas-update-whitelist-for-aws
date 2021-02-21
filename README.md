Home of the `mawaws` command!

Updates your MongoDB Atlas [IP
whitelist](https://docs.atlas.mongodb.com/security-whitelist/index.html) using
the published [IP
ranges](https://docs.aws.amazon.com/general/latest/gr/aws-ip-ranges.html) for
AWS Services. This makes it easy to `allow` a whole region so, for example, a
Lambda function on any EC2 instance in that region will be able to reach your
database. This was built for this exact use case and when you cannot use [VPC
with EC2 NAT](https://forums.aws.amazon.com/message.jspa?messageID=679504) to
give your Lambda a predicatable IP.

# Install
```bash
npm install -g mongo-atlas-update-whitelist-for-aws
mawaws help
```

# Running directly
 1. As a pre-requisite, you need to have an API key for MongoDB Atlas. Follow
    [these instructions](https://docs.atlas.mongodb.com/configure-api-access/)
    to get one.
 1. We need to get the ID of the group we want to update:
      ```bash
      mawaws list-groups \
        --user=abcdef \
        --key=4c03c17c-25d8-42fa-a762-bd9c22b5a55a
      ```
      ...and you'll see output that looks like:
      ```bash
      # example output
      Listing MongoDB Atlas groups (AKA projects)
      Available groups:
        1ab2bf4c3b53b9822afa9364: Project 1
      ```
 1. Now we perform the update to the whitelist for that project, using the ID
    from the previous command:
      ```bash
      mawaws update-whitelist \
        --region=ap-southeast-2 \
        --groupid=1ab2bf4c3b53b9822afa9364 \
        --user=abcdef \
        --key=4c03c17c-25d8-42fa-a762-bd9c22b5a55a
      ```

Note: the default service to get IPs for is `EC2`, if you wish to target a
different service, supply the `--service` param:

```bash
mawaws update-whitelist \
  --service=AMAZON \
  ... # continue with other params
```

# Running with docker
  1. either pull the pre-built docker image with
      ```bash
      docker pull tomsaleeba/mongo-atlas-update-whitelist-for-aws:1.1.0
      ```
  1. or, build the image locally with
      ```bash
      # after you've cloned this repo
      docker build -t tomsaleeba/mongo-atlas-update-whitelist-for-aws:1.1.0 .
      ```
  1. run the container and pass args like you would to the raw command
      ```bash
      docker run --rm -it tomsaleeba/mongo-atlas-update-whitelist-for-aws:1.1.0 --help
      docker run --rm -it tomsaleeba/mongo-atlas-update-whitelist-for-aws:1.1.0 \
        list-groups --user=abcdef --key=123abc
      ```

# Running using cron on AWS ECS Fargate
As the list of IP ranges is being updated semi-frequently, it makes sense to run
this command on a regular schedule.  See the instructions in
[aws-deploy/README.md](./aws-deploy/README.md) for how to set this up.

## TODO
 1. make `delete` function that can remove all entries for a region
 1. lots more validation of command line params
