/* check out slack bot api */
if (!process.env.TOKEN) {
  console.log('Error: Specify token in environment')
  process.exit(1)
}

const TOKEN = process.env.TOKEN

const giphy = require('giphy-api')()

let Botkit = require('./node_modules/botkit/lib/Botkit.js')
let os = require('os')

let controller = Botkit.slackbot({
  // debug: true
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

controller.hears(['hungry', 'i need food'],
        'direct_message,direct_mention,mention', function (bot, message) {
          let food = ['sushi', 'pizza', 'beer', 'dango', 'sake', 'taco', 'burrito', 'ramen', 'stew', 'peach', 'curry']
          let randomFood = food[Math.floor(Math.random() * food.length)]

          bot.reply(message, `:${randomFood}: here's a ${randomFood} for you`)
        })

controller.hears(['Harris', 'harris'],
  'direct_message,direct_mention,mention', function (bot, message) {
    bot.reply(message, 'That dude? He sucks man')
  })

controller.hears(['bored', 'tired', 'random'],
        'direct_message,direct_mention,mention', function (bot, message) {
          let gif = ['wassup', 'walking on sunshine', '#mashup beer', 'cheer up', 'too bad', 'you are creepy', 'fuck yes', 'no way', 'bow down to me', 'smart si wai', 'sleepy', 'toot my noot']
          let randomGif = gif[Math.floor(Math.random() * gif.length)]

          giphy.translate(randomGif, function (err, res) {
            if (err) console.log(err)
            // put the bot.reply in here cause the scope of genGif get lose outside of this scope
            // another is also because of the callback, if you put it outside, bot.reply will run first even before
            // you get any gif data.
            let genGif = res.data.url
            bot.reply(message, genGif)
          })
          // bot.reply(message, 'https://giphy.com/gifs/embarrassed-facepalm-panda-14aUO0Mf7dWDXW')
        })
controller.hears(['wayne', 'isabella', 'bella', 'love'],
        'direct_message,direct_mention,mention', function (bot, message) {
          let gif = ['humping', 'kisses', 'love', 'my love', 'sex baby']
          let randomGif = gif[Math.floor(Math.random() * gif.length)]

          giphy.translate(randomGif, function (err, res) {
            if (err) console.log(err)
            // put the bot.reply in here cause the scope of genGif get lose outside of this scope
            // another is also because of the callback, if you put it outside, bot.reply will run first even before
            // you get any gif data.
            let genGif = res.data.url
            bot.reply(message, genGif)
          })
        })

controller.hears(['where should we eat', 'lunch', 'where to eat', 'where to have', 'where should we go', 'what to eat', 'eat what'],
        'direct_message,direct_mention,mention', function (bot, message) {
          let text = ['maxwell', 'chinatown', 'salad', 'essen', 'muchachos', 'salad', 'coffeeshop opposite', 'salad', 'tzechar', 'paul’s', 'salad']
          let prompt = ['The tribe has spoken:', 'And... by unanimous vote:', 'You hate it but here goes:', 'Based on today\'s weather:', 'Do you even need to think?']
          let randomPrompt = prompt[Math.floor(Math.random() * prompt.length)]
          let randomText = text[Math.floor(Math.random() * text.length)].toUpperCase()

          bot.reply(message, `${randomPrompt}\n${randomText}`)
        })

controller.hears(['are you calling me fat', 'fat', 'are you'],
        'direct_message,direct_mention,mention', function (bot, message) {
          bot.reply(message, `YES`)
        })

controller.hears(['works', 'finally'],
        'direct_message,direct_mention,mention', function (bot, message) {
          bot.reply(message, `Finally. :sadparrot: :cry:`)
        })

// controller.hears(['you are (.*)'],
//         'direct_message,direct_mention,mention', function (bot, message) {
//           let mood = message.match[1]
//           if (mood === 'awesome' || 'cool' || 'lovely' || 'the best') {
//             bot.reply(message, `Why thank you!`)
//           }
//           if (mood === 'not' || 'uncool' || 'trash' || 'a liar') {
//             bot.reply(message, `Stop being ridiculous. :scream: Why would you think so? :face_with_rolling_eyes:`)
//           }
//         })
//
// controller.hears(['i (.*) you'],
//         'direct_message,direct_mention,mention', function (bot, message) {
//           let mood = message.match[1]
//           if (mood === 'love' || 'missed' || 'like') {
//             bot.reply(message, `Unlike @bebot2 I'm stupid and always offline. Thank you for appreciating me. :heart_eyes:`)
//           }
//           if (mood === 'hate') {
//             bot.reply(message, `Oh no! What did I do wrong? :cry:`)
//             setTimeout(function () {
//               bot.startConversation(message, function (err, convo) {
//                 if (err) {
//                   console.log(err.stack)
//                 }
//                 convo.ask('Do you think I can improve?', [
//                   {
//                     pattern: bot.utterances.yes,
//                     callback: function (response, convo) {
//                       convo.say('Thanks for believing in me. Here\'s a :octocat: for you!')
//                       convo.next()
//                     }
//                   },
//                   {
//                     pattern: bot.utterances.no,
//                     default: true,
//                     callback: function (response, convo) {
//                       convo.say('I hate you! Don\'t ever talk to me again!! :angry:')
//                       convo.next()
//                       setTimeout(function () {
//                         process.exit()
//                       }, 3000)
//                     }
//                   }
//                 ])
//               })
//             })
//           }
//         }, 3000)

controller.hears(['what is', '^fortune$'],
        'direct_message,direct_mention,mention', function (bot, message) {
          let prompt = ['You will meet cats everywhere you go', 'Beware of flying monkeys', 'Lady luck is on your side', 'Bad shit gonna start happening in 5 ... 4 ... 3 ... 2 ... 1', 'I cannot reveal the secrets of the heavens']
          let randomPrompt = prompt[Math.floor(Math.random() * prompt.length)]
          bot.reply(message, `:crystal_ball: Telling your fortune ...`)
          setTimeout(function () {
            bot.reply(message, `${randomPrompt}`)
          }, 3000)
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

// WIT AI code goes here
// 'use strict'
//
// let Wit = null
// let log = null
// try {
//   // if running from repo
//   Wit = require('../').Wit
//   log = require('../').log
// } catch (e) {
//   Wit = require('node-wit').Wit
//   log = require('node-wit').log
// }
//
// const WIT_TOKEN = process.env.WIT_TOKEN
//
// const firstEntityValue = (entities, entity) => {
//   const val = entities && entities[entity] &&
//     Array.isArray(entities[entity]) &&
//     entities[entity].length > 0 &&
//     entities[entity][0].value
//   if (!val) {
//     return null
//   }
//   return typeof val === 'object' ? val.value : val
// }
//
// const Actions = {
//   send (request, response) {
//     const {sessionId, context, entities} = request
//     const {text, quickreplies} = response
//     return new Promise(function (resolve, reject) {
//       console.log('sending...', JSON.stringify(response))
//       return resolve()
//     })
//   },
//   getForecast ({context, entities}) {
//     return new Promise(function (resolve, reject) {
//       var location = firstEntityValue(entities, 'location')
//       if (location) {
//         context.forecast = 'sunny in ' + location // we should call a weather API here
//         delete context.missingLocation
//       } else {
//         context.missingLocation = true
//         delete context.forecast
//       }
//       return resolve(context)
//     })
//   }
// }
//
// const wit = new Wit({
//   accessToken: WIT_TOKEN,
//   actions: Actions,
//   logger: new log.Logger(log.INFO)
// })
