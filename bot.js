if (!process.env.TOKEN) {
  console.log('Error: Specify token in environment')
  process.exit(1)
}

const TOKEN = process.env.TOKEN

let Botkit = require('./node_modules/botkit/lib/Botkit.js')
let os = require('os')

let controller = Botkit.slackbot({
  debug: true
})

let bot = controller.spawn({
  token: TOKEN
}).startRTM()

controller.hears(['hello', 'hi'], 'direct_message,direct_mention,mention', function (bot, message) {
  bot.api.reactions.add({
    timestamp: message.ts,
    channel: message.channel,
    name: 'robot_face'
  }, function (err, res) {
    if (err) {
      bot.botkit.log('Failed to add emoji reaction :(', err)
    }
  })

  controller.storage.users.get(message.user, function (err, user) {
    if (err) {
      console.log(err.stack)
    }
    if (user && user.name) {
      bot.reply(message, 'Hello ' + user.name + '!!')
    } else {
      bot.reply(message, 'Hello.')
    }
  })
})

controller.hears(['call me (.*)', 'my name is (.*)', 'i am (.*)'], 'direct_message,direct_mention,mention', function (bot, message) {
  let name = message.match[1]
  controller.storage.users.get(message.user, function (err, user) {
    if (err) {
      console.log(err.stack)
    }
    if (!user) {
      user = {
        id: message.user
      }
    }
    user.name = name
    controller.storage.users.save(user, function (err, id) {
      if (err) {
        console.log(err.stack)
      }
      bot.reply(message, 'Got it. I will call you ' + user.name + ' from now on.')
    })
  })
})

controller.hears(['what is my name', 'who am i'], 'direct_message,direct_mention,mention', function (bot, message) {
  controller.storage.users.get(message.user, function (err, user) {
    if (err) {
      console.log(err.stack)
    }
    if (user && user.name) {
      bot.reply(message, 'Your name is ' + user.name)
    } else {
      bot.startConversation(message, function (err, convo) {
        if (!err) {
          convo.say('I do not know your name yet!')
          convo.ask('What should I call you?', function (response, convo) {
            convo.ask('You want me to call you `' + response.text + '`?', [
              {
                pattern: 'yes',
                callback: function (response, convo) {
                // since no further messages are queued after this,
                // the conversation will end naturally with status == 'completed'
                  convo.next()
                }
              },
              {
                pattern: 'no',
                callback: function (response, convo) {
                // stop the conversation. this will cause it to end with status == 'stopped'
                  convo.stop()
                }
              },
              {
                default: true,
                callback: function (response, convo) {
                  convo.repeat()
                  convo.next()
                }
              }
            ])

            convo.next()
          }, {'key': 'nickname'}) // store the results in a field called nickname
          convo.on('end', function (convo) {
            if (convo.status === 'completed') {
              bot.reply(message, 'OK! I will update my dossier...')

              controller.storage.users.get(message.user, function (err, user) {
                if (err) {
                  console.log(err.stack)
                }
                if (!user) {
                  user = {id: message.user}
                }
                user.name = convo.extractResponse('nickname')
                controller.storage.users.save(user, function (err, id) {
                  if (err) {
                    console.log(err.stack)
                  }
                  bot.reply(message, 'Got it. I will call you ' + user.name + ' from now on.')
                })
              })
            } else {
            // this happens if the conversation ended prematurely for some reason
              bot.reply(message, 'OK, nevermind!')
            }
          })
        }
      })
    }
  })
})

controller.hears(['shutdown'], 'direct_message,direct_mention,mention', function (bot, message) {
  bot.startConversation(message, function (err, convo) {
    if (err) {
      console.log(err.stack)
    }
    convo.ask('Are you sure you want me to shutdown?', [
      {
        pattern: bot.utterances.yes,
        callback: function (response, convo) {
          convo.say('Bye!')
          convo.next()
          setTimeout(function () {
            process.exit()
          }, 3000)
        }
      },
      {
        pattern: bot.utterances.no,
        default: true,
        callback: function (response, convo) {
          convo.say('*Phew!*')
          convo.next()
        }
      }
    ])
  })
})

controller.hears(['uptime', 'identify yourself', 'who are you', 'what is your name'],
    'direct_message,direct_mention,mention', function (bot, message) {
      let hostname = os.hostname()
      let uptime = formatUptime(process.uptime())

      bot.reply(message,
            ':robot_face: I am a bot named <@' + bot.identity.name +
             '>. I have been running for ' + uptime + ' on ' + hostname + '.')
    })

controller.hears(['hungry', 'i need food', 'bored'],
        'direct_message,direct_mention,mention', function (bot, message) {
          let food = ['sushi', 'pizza', 'beer', 'dango', 'sake', 'taco', 'burrito', 'ramen', 'stew', 'peach', 'curry']
          let randomFood = food[Math.floor(Math.random() * food.length)]

          bot.reply(message, `:${randomFood}: here's a ${randomFood} for you`)
        })

function formatUptime (uptime) {
  let unit = 'second'
  if (uptime > 60) {
    uptime = uptime / 60
    unit = 'minute'
  }
  if (uptime > 60) {
    uptime = uptime / 60
    unit = 'hour'
  }
  if (uptime !== 1) {
    unit = unit + 's'
  }

  uptime = uptime + ' ' + unit
  return uptime
}
