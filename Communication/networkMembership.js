const fs = require('fs')

const util = require('../util.js')
var config = require('../config.js')

var messageString = require('./messageStrings.js');
var whisperUtils = require('./whisperUtils.js')

// TODO: Add to and from fields to validate origins
function requestExistingNetworkMembership(result, cb){

  console.log('[*] Requesting existing network membership. This will block until the other node responds')
  
  let shh = result.communicationNetwork.web3WSRPC.shh;

  let receivedNetworkMembership = false
  let subscription = null

  function onData(msg){
    let message = null
    if(msg && msg.payload){
      message = util.Hex2a(msg.payload)
    }
    if(message && message.indexOf('response|existingRaftNetworkMembership') >= 0){
      receivedNetworkMembership = true
      if(subscription){
        subscription.unsubscribe(function(err, res){
          if(err) { console.log('requestExistingNetworkMembership unsubscribe ERROR:', err) }
          subscription = null
        })
      }
      let messageTokens = message.split('|')
      console.log('[*] Network membership:', messageTokens[2])
      result.communicationNetwork.raftID = messageTokens[3]
      fs.writeFile('Blockchain/raftID', result.communicationNetwork.raftID, function(err){ 
        if(err) { console.log('requestExistingNetworkMembership write file ERROR:', err) }
        cb(null, result)
      })
    }
  }

  whisperUtils.addBootstrapSubscription(['NetworkMembership'], shh, onData, 
    function(err, _subscription){
    subscription = _subscription
  })

  let request = "request|existingRaftNetworkMembership";
  request += '|'+result.addressList[0] 
  request += '|'+result.enodeList[0]
  request += '|'+config.identity.nodeName

  whisperUtils.postAtInterval(request, shh, 'NetworkMembership', 5*1000, function(err, intervalID){
    let checkNetworkMembership = setInterval(function(){
      if(receivedNetworkMembership){
        clearInterval(intervalID)
        clearInterval(checkNetworkMembership)
      } 
    }, 1000)
  })
}

// TODO: Add to and from fields to validate origins
function requestNetworkMembership(result, cb){

  console.log('[*] Requesting network membership. This will block until the other node responds')
  
  let shh = result.communicationNetwork.web3WeRPtNetworkMembership.shh;
  
  let receivedNetworkMembership = false
  let subscription = null

  function onData(msg){
    let message = null
    if(msg && msg.payload){
      message = util.Hex2a(msg.payload)
    }
    if(message && message.indexOf('response|networkMembership') >= 0){
      receivedNetworkMembership = true
      if(subscription){
        subscription.unsubscribe(function(err, res){
          if(err) { console.log('requestNetworkMembership unsubscribe ERROR:', err) }
          subscription = null
        })
      }
      let messageTokens = message.split('|')
      console.log('[*] Network membership:', messageTokens[2])
      cb(null, result)
    }
  }

  whisperUtils.addBootstrapSubscription(['NetworkMembership'], shh, onData, 
    function(err, _subscription){
    subscription = _subscription
  })

  let request = "request|networkMembership";
  request += '|'+result.addressList[0] 
  request += '|'+result.enodeList[0]
  request += '|'+config.identity.nodeName
  whisperUtils.postAtInterval(request, shh, 'NetworkMembership', 5*1000, function(err, intervalID){
    let checkNetworkMembership = setInterval(function(){
      if(receivedNetworkMembership){
        clearInterval(intervalID)
        clearInterval(checkNetworkMembership)
      } 
    }, 1000)
  })
}

function addToAddressList(result, address){
  if(result.addressList){
    result.addressList.push(address)
  } else {
    result.addressList = [address]
  }
}

function addToEnodeList(result, enode){
  if(result.enodeList){
    result.enodeList.push(enode)
  } else {
    result.enodeList = [enode]  
  }
}

function allowAllNetworkMembershipRequests(result, msg, payload){

  let web3RPC = result.web3RPC;
  let payloadTokens = payload.split('|')
  addToAddressList(result, payloadTokens[1])
  addToEnodeList(result, payloadTokens[2])
  let peerName = payloadTokens[3]
  console.log(peerName + ' has joined the network')

  let from = msg.from // TODO: This needs to be added into a DB.

  let responseString = 'response|networkMembership|ACCEPTED';
  let hexString = new Buffer(responseString).toString('hex');        
  web3RPC.shh.post({
    "topics": ["NetworkMembership"],
    "payload": hexString,
    "ttl": 10,
    "workToProve": 1,
    "to": from
  }, function(err, res){
    if(err){console.log('allowAllNetworkMembershipRequests ERROR:', err);}
  });
}

function getNetworkBootstrapKey(web3RPC, cb){
  if(config.whisper.symKeyID){
    cb(config.whisper.symKeyID)
  } else {
    let id = web3RPC.shh.generateSymKeyFromPassword(
      config.whisper.symKeyPassword, function(err, id){
      config.whisper.symKeyID = id
      cb(err, config.whisper.symKeyID)
    })
  }
}

function networkMembershipRequestHandler(result, cb){
  let request = 'request|networkMembership'

  let web3RPC = result.web3WSRPC;

  function onData(msg){
    let message = null;
    if(msg && msg.payload){
      message = util.Hex2a(msg.payload);
    } 
    if(message && message.indexOf(request) >= 0){
      if(result.networkMembership == 'allowAll'){
        allowAllNetworkMembershipRequests(result, msg, message.replace(request, ''))
      } else if(result.networkMembership == 'allowOnlyPreAuth') {
        // TODO
      }
    }
  }

  whisperUtils.addBootstrapSubscription(["NetworkMembership"], web3RPC.shh, onData)

  cb(null, result);
}

function existingRaftNetworkMembership(result, cb){
  let request = 'request|existingRaftNetworkMembership'

  let web3RPC = result.web3RPC
  let commWeb3RPC = result.communicationNetwork.web3WSRPC
  let web3RPCQuorum = result.web3RPCQuorum

  function onData(msg){
    let message = null
    if(msg && msg.payload){
      message = util.Hex2a(msg.payload)
    } 
    if(message && message.indexOf(request) >= 0){
      if(result.networkMembership == 'allowAll'){
        let messageTokens = message.split('|')
        let peerName = messageTokens[4]
        let from = msg.from // TODO: This needs to be added into a DB.
        let peerEnode = messageTokens[3]
        web3RPCQuorum.addPeer(peerEnode, function(err, raftID){ 
          if(err){console.log('addPeer ERROR:', err)}
          console.log(peerName + ' has joined the network with raftID: '+raftID)
          let responseString = 'response|existingRaftNetworkMembership|ACCEPTED|'+raftID
          whisperUtils.post(responseString, commWeb3RPC.shh, 'NetworkMembership')
        })
      } else if(result.networkMembership == 'allowOnlyPreAuth') {
        // TODO
      }
    }
  }

  whisperUtils.addBootstrapSubscription(["NetworkMembership"], commWeb3RPC.shh, onData)

  cb(null, result)
}

exports.RequestNetworkMembership = requestNetworkMembership
exports.RequestExistingNetworkMembership = requestExistingNetworkMembership
exports.ExistingRaftNetworkMembership = existingRaftNetworkMembership
exports.NetworkMembershipRequestHandler = networkMembershipRequestHandler
