var exec = require('child_process').exec;
var fs = require('fs');
var async = require('async');

var events = require('../eventEmitter.js');
var util = require('../util.js');
var config = require('../config.js')
var ports = require('../config.js').ports
var networkMembership = require('./networkMembership.js');
var nodeInformation = require('./nodeInformation.js');
var messageString = require('./messageStrings.js');
var request = messageString.Request;
var response = messageString.Response;
var whisperUtils = require('./whisperUtils.js')

let whisperLog = 'whisperCommunications.log'

// TODO: Maybe check that address is indeed in need of some ether before sending it some
// TODO: Check from which address to send the ether, for now this defaults to eth.accounts[0]
function requestSomeEther(commWeb3RPC, address, cb){
  var message = messageString.BuildDelimitedString(request.ether, address);
  var hexString = new Buffer(message).toString('hex');        
  var postObj = messageString.BuildPostObject(['Ether'], hexString, 10, 1);
  commWeb3RPC.shh.post(postObj.JSON, function(err, res){
    if(err){console.log('err', err);}
    cb();
  });
}

// TODO: Maybe check that address is indeed in need of some ether before sending it some
// TODO: Check from which address to send the ether, for now this defaults to eth.accounts[0]
function addEtherResponseHandler(result, cb){
  var web3RPC = result.web3RPC
  var commWeb3RPC = result.communicationNetwork.web3WSRPC

  function onData(msg){
    var message = null
    if(msg && msg.payload){
      message = util.Hex2a(msg.payload)
    }
    if(message && message.indexOf(request.ether) >= 0){
      var address = message.substring(request.ether.length+2)

      if(web3RPC.eth.accounts && web3RPC.eth.accounts.length > 0){  
        web3RPC.eth.getBalance(web3RPC.eth.accounts[0], function(err, balance){
          let stringBalance = balance.toString()
          let intBalance = parseInt(stringBalance)
          if(intBalance > 0){
            var transaction = {
              from: web3RPC.eth.accounts[0],
              to: address,
              value: web3RPC.toWei(1, 'ether')
            }
            web3RPC.eth.sendTransaction(transaction, function(err, res){
              if(err){console.log('err', err)}
            })
          }
        })
      }           
    }
  }

  whisperUtils.addBootstrapSubscription(["Ether"], commWeb3RPC.shh, onData)

  cb(null, result)
}

// TODO: Add to and from fields to validate origins & only respond to others requests
// TODO: Add check whether requester has correct permissions
// This will broadcast this node's enode to any 'request|enode' message
function addEnodeResponseHandler(result, cb){
  let web3IPC = result.web3IPC
  let commWeb3RPC = result.communicationNetwork.web3WSRPC
  
  function onData(msg){
    var message = null
    if(msg && msg.payload){
      message = util.Hex2a(msg.payload)
    }
    if(message && message.indexOf(request.enode) >= 0){
      web3IPC.admin.nodeInfo(function(err, nodeInfo){
        if(err){console.log('ERROR:', err)}
        var enodeResponse = messageString.AppendData(response.enode, nodeInfo.enode);
        enodeResponse = enodeResponse.replace('\[\:\:\]', result.localIpAddress)
        var hexString = new Buffer(enodeResponse).toString('hex')
        var postObj = messageString.BuildPostObject(['Enode'], hexString, 10, 1);
        commWeb3RPC.shh.post(postObj.JSON, function(err, res){
          if(err){console.log('err', err);}
        })
      })
    }
  }

  whisperUtils.addBootstrapSubscription(["Enode"], commWeb3RPC.shh, onData)

  cb(null, result)
}

// TODO: Add to and from fields to validate origins & only respond to others requests
// TODO: Test assumption that we want to connect to all nodes that respond with enodes
// This requests other nodes for their enode and then waits for a response
function addEnodeRequestHandler(result, cb){
  var comm = result.communicationNetwork;
  var shh = comm.web3WSRPC.shh;
  
  var id = shh.newIdentity();
  var str = request.enode;
  var hexString = new Buffer(str).toString('hex');
  var postObj = messageString.BuildPostObject(['Enode'], hexString, 10, 1, id);

  setInterval(function(){
    shh.post(postObj.JSON, function(err, res){
      if(err){console.log('err', err)}
    })
  }, 10*1000)

  var filter = shh.filter(postObj.filterObject).watch(function(err, msg) {
    if(err){console.log("ERROR:", err);};
    var message = null;
    if(msg && msg.payload){
      message = util.Hex2a(msg.payload);
    }
    if(message && message.indexOf(response.enode) >= 0){
      var enode = message.replace(response.enode, '').substring(1);
      events.emit('newEnode', enode);
    }
  })
  
  cb(null, result);
}

function copyCommunicationNodeKey(result, cb){
  var cmd = 'cp communicationNodeKey CommunicationNode/geth/nodekey';
  var child = exec(cmd, function(){
    cb(null, result);
  });
  child.stderr.on('data', function(error){
    console.log('ERROR:', error);
    cb(error, null);
  });
}

// TODO: Add check whether requester has correct permissions
function genesisConfigHandler(result, cb){
  let genesisPath = process.cwd() + '/quorum-genesis.json'
  let web3RPC = result.web3WSRPC;

  function onData(msg){
    if(result.genesisBlockConfigReady != true){
      return
    }
    let message = null
    if(msg && msg.payload){
      message = util.Hex2a(msg.payload)
    } 
    if(message && message.indexOf(request.genesisConfig) >= 0){
      fs.readFile(genesisPath, 'utf8', function(err, data){
        if(err){console.log('ERROR:', err);}   
        let genesisConfig = messageString.AppendData(response.genesisConfig, data);
        let hexString = new Buffer(genesisConfig).toString('hex');        
        let postObj = messageString.BuildPostObject(['GenesisConfig'], hexString, 10, 1);
        web3RPC.shh.post(postObj.JSON, function(err, res){
          if(err){console.log('err', err);}
        });
      });
    }
  }  
  
  whisperUtils.addBootstrapSubscription(["GenesisConfig"], web3RPC.shh, onData)

  cb(null, result)
}

function staticNodesFileHandler(result, cb){
  let staticNodesPath = process.cwd() + '/Blockchain/static-nodes.json'
  let web3RPC = result.web3WSRPC;

  function onData(msg){
    if(result.staticNodesFileReady != true){
      return
    }
    var message = null;
    if(msg && msg.payload){
      message = util.Hex2a(msg.payload)
    } 
    if(message && message.indexOf(request.staticNodes) >= 0){
      fs.readFile(staticNodesPath, 'utf8', function(err, data){
        if(err){console.log('ERROR:', err)}
        var staticNodes = messageString.AppendData(response.staticNodes, data)
        var hexString = new Buffer(staticNodes).toString('hex')
        var postObj = messageString.BuildPostObject(['StaticNodes'], hexString, 10, 1)
        web3RPC.shh.post(postObj.JSON, function(err, res){
          if(err){console.log('err', err)}
        })
      })
    }
  }

  whisperUtils.addBootstrapSubscription(["StaticNodes"], web3RPC.shh, onData)

  cb(null, result)
}

// TODO: Add to and from fields to validate origins
function getGenesisBlockConfig(result, cb){

  console.log('[*] Requesting genesis block config. This will block until the other node is online')

  let shh = result.communicationNetwork.web3WSRPC.shh;
  
  let id = shh.newIdentity();
  let str = request.genesisConfig;
  let hexString = new Buffer(str).toString('hex');
  let postObj = messageString.BuildPostObject(['GenesisConfig'], hexString, 10, 1, id);

  let receivedGenesisConfig = false

  let intervalID = setInterval(function(){
    if(receivedGenesisConfig){
      clearInterval(intervalID)
    } else {
      shh.post(postObj.JSON, function(err, res){
        if(err){console.log('err', err)}
      })
    }
  }, 5000)

  let filter = shh.filter(postObj.filterObject).watch(function(err, msg) {
    if(err){console.log("ERROR:", err)}
    let message = null
    if(msg && msg.payload){
      message = util.Hex2a(msg.payload)
    }
    if(message && message.indexOf(response.genesisConfig) >= 0){
      console.log('received genesis config')
      if(receivedGenesisConfig == false){
        receivedGenesisConfig = true
        filter.stopWatching()
        let genesisConfig = message.replace(response.genesisConfig, '').substring(1)
        genesisConfig = genesisConfig.replace(/\\n/g, '')
        genesisConfig = genesisConfig.replace(/\\/g, '')
        fs.writeFile('quorum-genesis.json', genesisConfig, function(err, res){
          cb(err, result)
        })
      }
    }
  })
}

// TODO: Add to and from fields to validate origins
function getStaticNodesFile(result, cb){

  console.log('[*] Requesting static nodes file. This will block until the other node is online')

  var shh = result.communicationNetwork.web3WSRPC.shh;
  
  var id = shh.newIdentity();
  var str = request.staticNodes;
  var hexString = new Buffer(str).toString('hex');
  var postObj = messageString.BuildPostObject(['StaticNodes'], hexString, 10, 1, id);

  var receivedStaticNodesFile = false

  var intervalID = setInterval(function(){
    if(receivedStaticNodesFile){
      clearInterval(intervalID)
    } else {
      shh.post(postObj.JSON, function(err, res){
        if(err){console.log('err', err)}
      })
    }
  }, 5000)

  var filter = shh.filter(postObj.filterObject).watch(function(err, msg) {
    if(err){console.log("ERROR:", err)}
    var message = null
    if(msg && msg.payload){
      message = util.Hex2a(msg.payload)
    }
    if(message && message.indexOf(response.staticNodes) >= 0){
      console.log('received static nodes file')
      if(receivedStaticNodesFile == false){
        receivedStaticNodesFile = true
        filter.stopWatching()
        var staticNodesFile = message.replace(response.staticNodes, '').substring(1)
        staticNodesFile = staticNodesFile.replace(/\\n/g, '')
        staticNodesFile = staticNodesFile.replace(/\\/g, '')
        fs.writeFile('Blockchain/static-nodes.json', staticNodesFile, function(err, res){
          cb(err, result)
        })
      }
    }
  })
}

function startCommunicationNode(result, cb){
  var options = {encoding: 'utf8', timeout: 100*1000};
  var cmd = './startCommunicationNode.sh';
  cmd += ' '+ports.communicationNodeRPC
  cmd += ' '+ports.communicationNode
  cmd += ' '+ports.communicationNodeWS_RPC
  var child = exec(cmd, options);
  child.stdout.on('data', function(data){
    cb(null, result);
  });
  child.stderr.on('data', function(error){
    console.log('ERROR:', error);
    cb(error, null);
  });
}

function startCommunicationNetwork(result, cb){
  console.log('[*] Starting communication node...')
  let networkSetup = async.seq(
    util.ClearDirectories,
    util.CreateDirectories,
    copyCommunicationNodeKey,
    startCommunicationNode,
    util.CreateWeb3Connection,
    networkMembership.NetworkMembershipRequestHandler,
    genesisConfigHandler,
    staticNodesFileHandler 
  )

  let config = {
    networkMembership: result.networkMembership,
    folders: ['CommunicationNode', 'CommunicationNode/geth'], 
    "web3IPCHost": './CommunicationNode/geth.ipc',
    "web3RPCProvider": 'http://localhost:'+ports.communicationNodeRPC,
    "web3WSRPCProvider": 'ws://localhost:'+ports.communicationNodeWS_RPC
  }
  networkSetup(config, function(err, commNet){
    if (err) { console.log('ERROR:', err) }
    result.communicationNetwork = commNet
    cb(err, result)
  })
}

function joinCommunicationNetwork(config, cb){

  let remoteIpAddress = config.remoteIpAddress
  let remoteEnode = config.remoteEnode
  if(remoteEnode == null){
    remoteEnode = "enode://9443bd2c5ccc5978831088755491417fe0c3866537b5e9638bcb6ad34cb9bcc58a9338bb492590ff200a54b43a6a03e4a7e33fa111d0a7f6b7192d1ca050f300@"
    +remoteIpAddress
    +":"
    +ports.remoteCommunicationNode
  }

  console.log('Joining enode:', remoteEnode)

  console.log('[*] Joining communication network...');
  var seqFunction = async.seq(
    util.ClearDirectories,
    util.CreateDirectories,
    startCommunicationNode,
    util.CreateWeb3Connection,
    util.ConnectToPeer
  );

  var result = {
    folders: ['CommunicationNode', 'CommunicationNode/geth'], 
    "web3IPCHost": './CommunicationNode/geth.ipc',
    "web3RPCProvider": 'http://localhost:'+ports.communicationNodeRPC,
    "web3WSRPCProvider": 'ws://localhost:'+ports.communicationNodeWS_RPC,
    "enode": remoteEnode
  };
  seqFunction(result, function(err, commNet){
    if (err) { console.log('ERROR:', err) }
    config.communicationNetwork = commNet
    console.log('[*] Communication network joined');
    cb(err, config); 
  });
}


exports.StartCommunicationNetwork = startCommunicationNetwork
exports.JoinCommunicationNetwork = joinCommunicationNetwork
exports.AddEtherResponseHandler = addEtherResponseHandler
exports.AddEnodeResponseHandler = addEnodeResponseHandler
exports.AddEnodeRequestHandler = addEnodeRequestHandler
exports.GetGenesisBlockConfig = getGenesisBlockConfig
exports.RequestNetworkMembership = networkMembership.RequestNetworkMembership
exports.RequestExistingNetworkMembership = networkMembership.RequestExistingNetworkMembership
exports.ExistingRaftNetworkMembership = networkMembership.ExistingRaftNetworkMembership
exports.GetStaticNodesFile = getStaticNodesFile
exports.StaticNodesFileHandler = staticNodesFileHandler
exports.RequestSomeEther = requestSomeEther
exports.PublishNodeInformation = nodeInformation.PublishNodeInformation
