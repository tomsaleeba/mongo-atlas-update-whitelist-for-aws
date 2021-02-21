#!/usr/bin/env node
const awsIpRanges = require('aws-ip-ranges')
const request = require('request-promise')
const arrayDiff = require('simple-array-diff')
const commandLineArgs = require('command-line-args')
const commandLineUsage = require('command-line-usage')

const LIST_GROUPS_COMMAND_NAME = 'list-groups'
const UPDATE_WHITELIST_COMMAND_NAME = 'update-whitelist'
const HELP_COMMAND_NAME = 'help'
const THIS_SCRIPT_COMMAND_NAME = 'mawaws'
const DEFAULT_ATLAS_API_URL = 'https://cloud.mongodb.com/api/atlas/v1.0'

const mainCommandDefinitions = [
  { name: 'command', defaultOption: true, type: String, description: `${LIST_GROUPS_COMMAND_NAME}|${UPDATE_WHITELIST_COMMAND_NAME}|${HELP_COMMAND_NAME}`,
      typeLabel: '{underline command}' },
]

const commonOptions = [
  { name: 'verbose', alias: 'v', type: Boolean, description: 'more logging' },
  { name: 'user', alias: 'u', type: String, description: 'MongoDB Atlas username, e.g: user@example.com', required: true },
  { name: 'key', alias: 'k', type: String, description: 'MongoDB Atlas API key, e.g: 4c03c17c-25d8-42fa-a762-bd9c22b5a55a', required: true },
  { name: 'atlasapiurl', alias: 'a', type: String, defaultValue: DEFAULT_ATLAS_API_URL,
    description: `MongoDB Atlas API URL, default ${DEFAULT_ATLAS_API_URL}`, typeLabel: '{underline url}' },
]

const listGroupsOptionDefinitions = commonOptions

const updateWhitelistOptionDefinitions = [
  { name: 'region', alias: 'r', type: String, description: 'AWS region to get IPs for, e.g: ap-southeast-2', required: true },
  { name: 'service', alias: 's', type: String, defaultValue: 'EC2', description: 'AWS service to get IPs for, e.g: EC2', required: true },
  { name: 'groupid', alias: 'g', type: String, description: 'ID of the group (project) in MongoDB, e.g: 1ab2bf4c3b53b9822afa9364', required: true },
].concat(commonOptions)

const usageSections = [{
    header: 'MongoDB Atlas Whitelist updater',
    content: 'updates your MongoDB Atlas IP whitelist ' +
             'using the published IP ranges for AWS Services. This makes it ' +
             'easy to allow a whole AWS region access through the firewall. ' +
             'So, for example, your Lambda function which can run on any EC2 ' +
             'instance in that region will be able to reach your database.'
  }, {
    header: 'Usage',
    content: `$ ${THIS_SCRIPT_COMMAND_NAME} <command> <options>`
  }, {
    header: 'Command list',
    content: [
      { name: 'list-groups', summary: 'List MongoDB Atlas groups (projects).' },
      { name: 'update-whitelist', summary: 'Update whitelist IP for a group.' },
      { name: 'help', summary: 'Display help information.' },
    ]
  }, {
    header: 'list-groups example usage',
    content: `${THIS_SCRIPT_COMMAND_NAME} ${LIST_GROUPS_COMMAND_NAME} \\
             --user=user@example.com \\
             --key=4c03c17c-25d8-42fa-a762-bd9c22b5a55a`,
  }, {
    header: 'list-groups options',
    optionList: listGroupsOptionDefinitions
  }, {
    header: 'update-whitelist example usage',
    content: `${THIS_SCRIPT_COMMAND_NAME} ${UPDATE_WHITELIST_COMMAND_NAME} \\
             --region=ap-southeast-2 \\
             --groupid=1ab2bf4c3b53b9822afa9364 \\
             --user=user@example.com \\
             --key=4c03c17c-25d8-42fa-a762-bd9c22b5a55a`
  }, {
    header: 'update-whitelist options',
    optionList: updateWhitelistOptionDefinitions
  }]

function doUpdateWhitelist (options) {
  console.log('Performing whitelist update')
  console.log(`Using AWS region '${options.region}' and service '${options.service}'`)

  let atlasUserId = options.user
  let atlasApiKey = options.key

  const whitelistUrl = `${options.atlasapiurl}/groups/${options.groupid}/accessList`

  // get current whitelist
  let currentWhitelistPromise = request
    .get(whitelistUrl)
    .auth(atlasUserId, atlasApiKey, false)

  // get AWS IP ranges
  let awsIpsPromise = awsIpRanges({
    service: options.service,
    region: options.region
  })

  Promise.all([currentWhitelistPromise, awsIpsPromise]).then(responses => {
    let currentWhitelistStr = responses[0]
    let awsIps = responses[1]

    let currentWhitelist = JSON.parse(currentWhitelistStr)
    console.log(`${currentWhitelist.results.length} whitelist records exist currently`)
    const existingCidrs = []
    for (let curr of currentWhitelist.results) {
      existingCidrs.push(curr.cidrBlock)
    }
    if (options.verbose) {
      console.log('List of existing whitelist CIDRs:')
      console.log(existingCidrs)
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
    if (options.verbose) {
      console.log('New whitelist records to be added:')
      console.log(newWhitelistEntries)
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

function doListGroups (options) {
  console.log('Listing MongoDB Atlas groups (AKA projects)')
  let atlasUserId = options.user
  let atlasApiKey = options.key

  const groupsUrl = `${options.atlasapiurl}/groups`

  request
    .get(groupsUrl)
    .auth(atlasUserId, atlasApiKey, false)
    .then(response => {
      const responseObj = JSON.parse(response)
      if (options.verbose) {
        console.log('Full group list response:')
        console.log(responseObj)
      }
      console.log('Available groups:')
      for (let curr of responseObj.results) {
        console.log(`  ${curr.id}: ${curr.name}`)
      }
    })
    .catch(error => {
      console.error('ERROR: failed to list groups, stack trace to follow')
      console.error(error.stack)
    })
}

function printHelpAndExit () {
  const usage = commandLineUsage(usageSections)
  console.log(usage)
  process.exit(0)
}

function commonOptionsValidation (options, definitions) {
  for (let curr of definitions) {
    if (!curr.required) {
      continue
    }
    const optionName = curr.name
    const val = options[optionName]
    if (typeof(val) === 'undefined' || val === null || String(val.length).trim() === 0) {
      console.error(`ERROR: '${optionName}' is a required option but was not supplied.`)
      console.error(`       use the 'help' command to get usage information.`)
      process.exit(1)
    }
  }
}

function updateWhitelistOptionsValidation (options) {
  // TODO add validation
}

function validateMainCommand (options) {
  const command = options.command
  const argv = options._unknown || []
  switch (command) {
    case LIST_GROUPS_COMMAND_NAME:
      const listGroupsOptions = commandLineArgs(listGroupsOptionDefinitions, { argv })
      commonOptionsValidation(listGroupsOptions, listGroupsOptionDefinitions)
      return listGroupsOptions
    case UPDATE_WHITELIST_COMMAND_NAME:
      const updateWhitelistOptions = commandLineArgs(updateWhitelistOptionDefinitions, { argv })
      commonOptionsValidation(updateWhitelistOptions, updateWhitelistOptionDefinitions)
      updateWhitelistOptionsValidation(updateWhitelistOptions)
      return updateWhitelistOptions
    case HELP_COMMAND_NAME:
      printHelpAndExit()
      break
    default:
      console.error(`ERROR: command must be one of ${LIST_GROUPS_COMMAND_NAME}|${UPDATE_WHITELIST_COMMAND_NAME}|${HELP_COMMAND_NAME}.`)
      printHelpAndExit()
      break
  }
}

const commandMapping = {
  [LIST_GROUPS_COMMAND_NAME]: doListGroups,
  [UPDATE_WHITELIST_COMMAND_NAME]: doUpdateWhitelist
}

try {
  const mainCommandOptions = commandLineArgs(mainCommandDefinitions, { stopAtFirstUnknown: true })
  const options = validateMainCommand(mainCommandOptions)
  commandMapping[mainCommandOptions.command](options)
} catch (error) {
  console.error(error.message)
  printHelpAndExit()
}
