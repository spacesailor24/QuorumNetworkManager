const fs = require('fs')

const util = require('../util.js')
var config = require('../config.js')


// TODO: Add to and from fields to validate origins
function requestExistingNetworkMembership(result, cb){

  console.log('[*] Requesting existing network membership. This will block until the other node responds')
  
  let shh = result.communicationNetwork.web3RPC.shh;
  let id = shh.newIdentity();
  
  let request = "request|existingRaftNetworkMembership";
  request += '|'+result.addressList[0] 
  request += '|'+result.enodeList[0]
  request += '|'+config.identity.nodeName
  let hexString = new Buffer(request).toString('hex');

  let receivedNetworkMembership = false
  let intervalID = setInterval(function(){
    if(receivedNetworkMembership){
      clearInterval(intervalID)
    } else {
      shh.post({
        "from": id,
        "topics": ["NetworkMembership"],
        "payload": hexString,
        "ttl": 10,
        "workToProve": 1
      }, function(err, res){
        if(err){console.log('err', err)}
      })
    }
  }, 5000)

  let networkFilter = shh.filter({"topics":["NetworkMembership"]}).watch(function(err, msg) {
    if(err){console.log("ERROR:", err)}
    let message = null
    if(msg && msg.payload){
      message = util.Hex2a(msg.payload)
    }
    if(message && message.indexOf('response|existingRaftNetworkMembership') >= 0){
      receivedNetworkMembership = true
      networkFilter.stopWatching() 
      let messageTokens = message.split('|')
      console.log('[*] Network membership:', messageTokens[2])
      result.communicationNetwork.raftID = messageTokens[3]
      fs.writeFile('Blockchain/raftID', result.communicationNetwork.raftID, function(err){ 
        if(err) {
          console.log('ERROR:', err);
        }
        cb(null, result)
      })
    }
  })
}

// TODO: Add to and from fields to validate origins
function requestNetworkMembership(result, cb){

  console.log('[*] Requesting network membership. This will block until the other node responds')
  
  let shh = result.communicationNetwork.web3RPC.shh;
  let id = shh.newIdentity();
  
  let request = "request|networkMembership";
  request += '|'+result.addressList[0] 
  request += '|'+result.enodeList[0]
  request += '|'+config.identity.nodeName
  let hexString = new Buffer(request).toString('hex');

  let receivedNetworkMembership = false
  let intervalID = setInterval(function(){
    if(receivedNetworkMembership){
      clearInterval(intervalID)
    } else {
      shh.post({
        "from": id,
        "topics": ["NetworkMembership"],
        "payload": hexString,
        "ttl": 10,
        "workToProve": 1
      }, function(err, res){
        if(err){console.log('err', err)}
      })
    }
  }, 5000)

  let filter = shh.filter({"topics":["NetworkMembership"]}).watch(function(err, msg) {
    if(err){console.log("ERROR:", err)}
    let message = null
    if(msg && msg.payload){
      message = util.Hex2a(msg.payload)
    }
    if(receivedNetworkMembership == false && 
        message && 
        message.indexOf('response|networkMembership') >= 0
    ){
      receivedNetworkMembership = true
      let messageTokens = message.split('|')
      console.log('[*] Network membership:', messageTokens[2])
      cb(null, result)
    }
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
    if(err){console.log('err', err);}
  });
}

function networkMembershipRequestHandler(result, cb){
  let request = 'request|networkMembership'

  let web3RPC = result.web3RPC;
  web3RPC.shh.filter({"topics":["NetworkMembership"]}).watch(function(err, msg) {
    if(err){console.log("ERROR:", err);};
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
  });
  cb(null, result);
}

function postMessage(connection, to, responseString){

  let hexString = new Buffer(responseString).toString('hex');        
  connection.shh.post({
    "topics": ["NetworkMembership"],
    "payload": hexString,
    "ttl": 10,
    "workToProve": 1,
    "to": to
  }, function(err, res){
    if(err){console.log('err', err);}
  });
} 

let peers = []
function existingRaftNetworkMembership(result, cb){
  let request = 'request|existingRaftNetworkMembership'

  let web3RPC = result.web3RPC
  let commWeb3RPC = result.communicationNetwork.web3RPC
  let web3RPCQuorum = result.web3RPCQuorum
  commWeb3RPC.shh.filter({"topics":["NetworkMembership"]}).watch(function(err, msg) {
    if(err){console.log("ERROR:", err);};
    let message = null;
    if(msg && msg.payload){
      message = util.Hex2a(msg.payload);
    } 
    if(!peers.contains(from) && message && message.indexOf(request) >= 0){
      peers.push(msg.from)
      if(result.networkMembership == 'allowAll'){
        let messageTokens = message.split('|')
        let peerName = messageTokens[4]
        let from = msg.from // TODO: This needs to be added into a DB.
        let peerEnode = messageTokens[3]
        web3RPCQuorum.raft.addPeer(peerEnode, function(err, raftID){
          if(err){console.log('addPeer ERROR:', err)}
          console.log(peerName + ' has joined the network with raftID: '+raftID)
          let responseString = 'response|existingRaftNetworkMembership|ACCEPTED|'+raftID
          postMessage(commWeb3RPC, from, responseString)
        })
      } else if(result.networkMembership == 'allowOnlyPreAuth') {
        // TODO
      }
    }
  });
  cb(null, result);
}

exports.RequestNetworkMembership = requestNetworkMembership
exports.RequestExistingNetworkMembership = requestExistingNetworkMembership
exports.ExistingRaftNetworkMembership = existingRaftNetworkMembership
exports.NetworkMembershipRequestHandler = networkMembershipRequestHandler
