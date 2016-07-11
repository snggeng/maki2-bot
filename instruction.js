#!/usr/bin/env node

var ASSERT = require('assert')
ASSERT(process.env.token, 'YOU MUST PROVIDE A SLACK API TOKEN IN THE ENVIRONMENT VARIABLE SLACK_API_TOKEN.')

var SLACKBOT = require('./bot.js')
var WEATHER = new SLACKBOT()
