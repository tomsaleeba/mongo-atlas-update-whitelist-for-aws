#!/usr/bin/env node
const awsIpRanges = require('aws-ip-ranges')
const request = require('request-promise')
const arrayDiff = require('simple-array-diff')
const commandLineArgs = require('command-line-args')
const commandLineUsage = require('command-line-usage')

const DEFAULT_ATLAS_API_URL = 'https://cloud.mongodb.com/api/atlas/v1.0'

const optionDefinitions = [
  { name: 'help', alias: 'h', type: Boolean, description: 'show this help' },
  { name: 'verbose', alias: 'v', type: Boolean, description: 'more logging' },
  { name: 'region', alias: 'r', type: String, description: 'AWS region to get IPs for, e.g: ap-southeast-2', required: true },
  { name: 'service', alias: 's', type: String, defaultValue: 'EC2', description: 'AWS service to get IPs for, e.g: EC2', required: true },
  { name: 'groupid', alias: 'g', type: String, description: 'ID of the group (project) in MongoDB, e.g: 1ab2bf4c3b53b9822afa9364', required: true },
  { name: 'user', alias: 'u', type: String, description: 'MongoDB Atlas username, e.g: user@example.com', required: true },
  { name: 'key', alias: 'k', type: String, description: 'MongoDB Atlas API key, e.g: 4c03c17c-25d8-42fa-a762-bd9c22b5a55a', required: true },
  { name: 'atlasapiurl', alias: 'a', type: String, defaultValue: DEFAULT_ATLAS_API_URL,
    description: `MongoDB Atlas API URL, default ${DEFAULT_ATLAS_API_URL}`, typeLabel: '{underline url}' },
]

const usageSections = [{
    header: 'Whitelist updater',
    content: 'a tool that will update your MongoDB Atlas whitelist '+
             'using the published IP ranges for AWS Services.'
  }, {
    header: 'Options',
    optionList: optionDefinitions
}]

function doit (options) {
  if (options.help) {
    printHelpAndExit()
  }
  console.log(`Using AWS region '${options.region}' and service '${options.service}'`)

  let atlasUserId = options.user
  let atlasApiKey = options.key

  const whitelistUrl = `${options.atlasapiurl}/groups/${options.groupid}/whitelist`
  
  // get current whitelist
  let currentWhitelistPromise = request
    .get(whitelistUrl)
    .auth(atlasUserId, atlasApiKey, false)

  let awsIpsPromise = awsIpRanges({
    service: options.service,
    region: options.region
  })

  Promise.all([currentWhitelistPromise, awsIpsPromise]).then(responses => {
    let currentWhitelistStr = responses[0]
    let awsIps = responses[1]

    // get AWS IP ranges
    let currentWhitelist = JSON.parse(currentWhitelistStr)
    const existingCidrs = []
    for (let curr of currentWhitelist.results) {
      existingCidrs.push(curr.cidrBlock)
    }

    // calculate diff
    let ipRangeDiff = arrayDiff(existingCidrs, awsIps)
    return ipRangeDiff
  })
  .then(ipRangeDiff => {
    // TODO deal with ipRangeDiff.removed
  
    // prepare array of new entries
    const newWhitelistEntries = []
    for (let curr of ipRangeDiff.added) {
      newWhitelistEntries.push({
        cidrBlock: curr,
        comment: `AWS ${options.service} ${options.region}`
      })
    }
    
    const itemsAddedCount = newWhitelistEntries.length
    console.log(`${itemsAddedCount} item(s) to be added`)

    // POST new entries
    return request
      .post({
        url: whitelistUrl,
        json: newWhitelistEntries
      })
      .auth(atlasUserId, atlasApiKey, false)
  })
  .then(updateResult => {
    console.log(`${updateResult.totalCount} records exist now`)
  })
  .catch(err => {
    console.error('Something broke, more details to follow.')
    console.error(err.stack)
  })
}

function printHelpAndExit () {
  const usage = commandLineUsage(usageSections)
  console.log(usage)
  process.exit(0)
}

function validate (options) {
  for (let curr of optionDefinitions) {
    if (!curr.required) {
      continue
    }
    const optionName = curr.name
    const val = options[optionName]
    if (typeof(val) === 'undefined' || val === null || String(val.length).trim() === 0) {
      console.error(`ERROR: '${optionName}' is a required option but was not supplied`)
      console.error(`       use the --help or -h option to get usage information`)
      process.exit(1)
    }
  }
}

try {
  const options = commandLineArgs(optionDefinitions)
  validate(options)
  doit(options)
} catch (error) {
  console.error(error.message)
  printHelpAndExit()
}
