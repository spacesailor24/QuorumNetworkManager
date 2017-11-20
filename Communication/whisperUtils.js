var messageString = require('./messageStrings.js');
var config = require('../config.js')

function getNetworkBootstrapKey(web3RPC, cb){
  if(config.whisper.symKeyID){
    cb(null, config.whisper.symKeyID)
  } else {
    let id = web3RPC.shh.generateSymKeyFromPassword(
      config.whisper.symKeyPassword, function(err, id){
      config.whisper.symKeyID = id
      cb(err, config.whisper.symKeyID)
    })
  }
}

function addSubscription(symKeyID, topicArr, web3RPC, onData){
  let topics = messageString.BuildFilterObject(topicArr).topics
  let subscription = web3RPC.shh.subscribe('messages', {topics, symKeyID})
  subscription.on('data', onData)
  subscription.on('error', function(error){
    console.log('ERROR:', error)
  })
}

function addBootstrapSubscription(topics, web3RPC, onData){

  getNetworkBootstrapKey(web3RPC, function(err, symKeyID){
    if(err){console.log('ERROR:', err)}
    addSubscription(symKeyID, topics, web3RPC, onData) 
  })
}

exports.addSubscription = addSubscription
exports.addBootstrapSubscription = addBootstrapSubscription
