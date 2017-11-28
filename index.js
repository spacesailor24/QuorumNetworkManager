var prompt = require('prompt')

var util = require('./util.js')
var newRaftNetwork = require('./newRaftNetwork.js')
var joinRaftNetwork = require('./joinRaftNetwork.js')
var joinExistingRaftNetwork = require('./joinExistingRaftNetwork.js')
var ipAddresses = require('./ipAddress.js')
var config = require('./config.js')

prompt.start();
// TODO: These global vars should be refactored
var raftNetwork = null
var communicationNetwork = null
var localIpAddress = null
var remoteIpAddress = null
var checkForOtherProcesses = false

var consensus = null //RAFT or IBFT

function handleConsensusChoice(){
  console.log('Please select an option:\n1) Raft\n2) QuorumChain [Disabled - this does not work on newer versions of Quorum]\n5) Kill all geth and constellation')
  prompt.get(['option'], function(err, answer){
    if(answer.option == 1){
      consensus = 'raft'
      mainLoop()
    } else if(answer.option == 5){
      util.KillallGethConstellationNode(function(err, result){
        if (err) { return onErr(err); }
        raftNetwork = null
        communicationNetwork = null;
        mainLoop()
      })      
    } else {
      handleConsensusChoice()
    }
  })
}

function handleNetworkMembership(cb){
  console.log('Please select an option below:');
  console.log('1) Allow anyone to connect');
  console.log('2) [TODO] Allow only people with pre-auth tokens to connect');
  prompt.get(['option'], function(err, result){
    if(result.option == 1){
      cb({
        networkMembership: 'allowAll'
      })
    } else {
      console.log('This option is still TODO, defaulting to option 1');
      cb({
        //networkMembership: 'allowOnlyPreAuth'
        networkMembership: 'allowAll'
      })
    } 
  })
}

function keepExistingFiles(cb){
  console.log('Please select an option below:');
  console.log('1) Clear all files/configuration and start from scratch[WARNING: this clears everything]')
  console.log('2) Keep old files/configuration intact and start the node + whisper services')
  prompt.get(['option'], function(err, result){
    let keepFiles = false;
    if(result.option == 1){
      keepFiles = false
    } else {
      keepFiles = true
    } 
    cb({
      keepExistingFiles: keepFiles
    })
  })
}

function handleRaftConsensus(){
  console.log('Please select an option below:');
  console.log('----- Option 1 and 2 are for the initial setup of a raft network -----')
  console.log('1) Start a node as the setup coordinator [Ideally there should only be one coordinator]')
  console.log('2) Start a node as a non-coordinator')
  console.log('----- Option 3 is for joining a raft network post initial setup  -----')
  console.log('3) Join a raft network if you were not part of the initial setup')
  console.log('4) TODO: Start whisper services and attach to already running node')
  console.log('5) Kill all geth constellation-node');
  console.log('0) Quit');
  prompt.get(['option'], function(err, result){
    if(result.option == 1){
      handleNetworkMembership(function(res){
        keepExistingFiles(function(setup){
          let options = {
            localIpAddress: localIpAddress,
            networkMembership: res.networkMembership,
            keepExistingFiles: setup.keepExistingFiles
          };
          newRaftNetwork.HandleStartingNewRaftNetwork(options, function(err, networks){
            raftNetwork = networks.raftNetwork
            communicationNetwork = networks.communicationNetwork
            mainLoop()
          })
        })
      })
    } else if(result.option == 2){
      keepExistingFiles(function(setup){
        let options = {
          localIpAddress: localIpAddress,
          keepExistingFiles: setup.keepExistingFiles
        };
        joinRaftNetwork.HandleJoiningRaftNetwork(options, function(err, networks){
          raftNetwork = networks.raftNetwork
          communicationNetwork = networks.communicationNetwork
          mainLoop()
        })
      })
    } else if(result.option == 3){
      keepExistingFiles(function(setup){
        let options = {
          localIpAddress: localIpAddress,
          keepExistingFiles: setup.keepExistingFiles
        };
        joinExistingRaftNetwork.HandleJoiningRaftNetwork(options, function(err, networks){
          raftNetwork = networks.raftNetwork
          communicationNetwork = networks.communicationNetwork
          mainLoop()
        })
      })
    } else if(result.option == 4){
      console.log('This is stil on the TODO list')
      mainLoop()
    } else if(result.option == 5){
      util.KillallGethConstellationNode(function(err, result){
        if (err) { return onErr(err) }
        raftNetwork = null
        communicationNetwork = null
        mainLoop()
      })
    } else if(result.option == 0){
      console.log('Quiting')
      process.exit(0)
      return
    } else {
      mainLoop()
    }
  })
}

function mainLoop(){
  if(localIpAddress && checkForOtherProcesses == false) {
    util.CheckPreviousCleanExit(function(err, done){
      if(err) {console.log('ERROR:', err)}
      checkForOtherProcesses = done
      mainLoop()
    })
  } else if(localIpAddress && checkForOtherProcesses && consensus === 'raft'){
    handleRaftConsensus()
  } else if(localIpAddress && checkForOtherProcesses && consensus == null){
    handleConsensusChoice()
  } else {
    console.log('Trying to get public ip address, please wait a few seconds...')
    ipAddresses.WhatIsMyIp(function(ip){
      console.log('Welcome! \n\n'
        +'Please enter the IP address other nodes will use to connect to this node. \n\n'
        +'Also, please enter a publicly identifyable string for this node to use.\n\n')
      let schema = [{
        name: 'localIpAddress',
        default: ip.publicIp
      }, {
        name: 'nodeName' // TODO: Add schema to remove unwanted characters etc.
      }]
      prompt.get(schema, function (err, answer) {
        localIpAddress = answer.localIpAddress
        config.identity.nodeName = answer.nodeName
        mainLoop()
      })
    })
  }
}

function onErr(err) {
  console.log(err);
  return 1;
}

mainLoop();
