# Usage
```
Whitelist updater

  a tool that will update your MongoDB Atlas whitelist using the published IP
  ranges for AWS Services.

Options

  -h, --help              show this help
  -v, --verbose           more logging
  -r, --region string     AWS region to get IPs for, e.g: ap-southeast-2
  -s, --service string    AWS service to get IPs for, e.g: EC2
  -g, --groupid string    ID of the group (project) in MongoDB, e.g: 1ab2bf4c3b53b9822afa9364
  -u, --user string       MongoDB Atlas username, e.g: user@example.com
  -k, --key string        MongoDB Atlas API key, e.g: 4c03c17c-25d8-42fa-a762-bd9c22b5a55a
  -a, --atlasapiurl url   MongoDB Atlas API URL, default https://cloud.mongodb.com/api/atlas/v1.0
```

# Install and run
```bash
git clone <this repo>
cd <this repo>
yarn
./app.js \
  --region=ap-southeast-2 \
  --groupid=1ab2bf4c3b53b9822afa9364 \
  --user=user@example.com \
  --key=4c03c17c-25d8-42fa-a762-bd9c22b5a55a
```

## TODO
 1. make `delete` function that can remove all entries for a region
 1. make a command to list group IDs
 1. lots more validation
