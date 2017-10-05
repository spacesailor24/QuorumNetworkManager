let async = require('async')
let exec = require('child_process').exec
let prompt = require('prompt')
let fs = require('fs')

let whisper = require('./Communication/whisperNetwork.js')
let util = require('./util.js')
let constellation = require('./constellation.js')
let statistics = require('./networkStatistics.js')
let peerHandler = require('./peerHandler.js')
let fundingHandler = require('./fundingHandler.js')
let ports = require('./config.js').ports
let setup = require('./config.js').setup

prompt.start()

function startRaftNode(result, cb){
  console.log('[*] Starting raft node...')
  let options = {encoding: 'utf8', timeout: 100*1000}
  let cmd = './startRaftNode.sh'
  cmd += ' '+ports.gethNodeRPC
  cmd += ' '+ports.gethNode
  cmd += ' '+ports.raftHttp
  let child = exec(cmd, options)
  child.stdout.on('data', function(data){
    cb(null, result)
  })
  child.stderr.on('data', function(error){
    console.log('ERROR:', error)
    cb(error, null)
  })
}

function createStaticNodeFile(enodeList, cb){
  let options = {encoding: 'utf8', timeout: 100*1000};
  let list = ''
  for(let enode of enodeList){
    list += '"'+enode+'",'
  }
  list = list.slice(0, -1)
  let staticNodes = '['
    + list
    +']'
  
  fs.writeFile('Blockchain/static-nodes.json', staticNodes, function(err, res){
    cb(err, res);
  });
}

function getConfiguration(result, cb){
  if(setup.automatedSetup){
    if(setup.enodeList){
      result.enodeList = result.enodeList.concat(setup.enodeList) 
    } 
    createStaticNodeFile(result.enodeList, function(err, res){
      result.communicationNetwork.staticNodesFileReady = true
      cb(err, result)
    })
  } else {
    console.log('Please wait for others to join. Hit any key + enter once done.')
    prompt.get(['done'] , function (err, answer) {
      if(result.communicationNetwork && result.communicationNetwork.enodeList){
        result.enodeList = result.enodeList.concat(result.communicationNetwork.enodeList) 
      }
      createStaticNodeFile(result.enodeList, function(err, res){
        result.communicationNetwork.staticNodesFileReady = true
        cb(err, result)
      })
    })
  }
}

function addAddresslistToQuorumConfig(result, cb){
  result.blockMakers = result.addressList
  result.blockVoters = result.addressList
  if(setup.addressList && setup.addressList.length > 0){
    result.blockMakers = result.blockMakers.concat(setup.addressList) 
    result.blockVoters = result.blockVoters.concat(setup.addressList) 
  } 
  if(result.communicationNetwork && result.communicationNetwork.addressList){
    result.blockMakers = result.blockMakers.concat(result.communicationNetwork.addressList) 
    result.blockVoters = result.blockVoters.concat(result.communicationNetwork.addressList) 
  }
  result.threshold = 1 
  cb(null, result)
}

function handleExistingFiles(result, cb){
  if(result.keepExistingFiles == false){ 
    let seqFunction = async.seq(
      util.ClearDirectories,
      util.CreateDirectories,
      util.GenerateNodeKey,    
      util.DisplayEnode
    )
    seqFunction(result, function(err, res){
      if (err) { return console.log('ERROR', err) }
      cb(null, res)
    })
  } else {
    cb(null, result)
  }
}

function handleNetworkConfiguration(result, cb){
  if(result.keepExistingFiles == false){ 
    let seqFunction = async.seq(
      getConfiguration,
      util.GetNewGethAccount,
      addAddresslistToQuorumConfig,
      util.CreateQuorumConfig,
      util.CreateGenesisBlockConfig,
      constellation.CreateNewKeys, 
      constellation.CreateConfig
    )
    seqFunction(result, function(err, res){
      if (err) { return console.log('ERROR', err) }
      cb(null, res)
    })
  } else {
    result.communicationNetwork.genesisBlockConfigReady = true
    result.communicationNetwork.staticNodesFileReady = true
    cb(null, result)
  }
}

function startNewRaftNetwork(config, cb){
  console.log('[*] Starting new node...')

  let nodeConfig = {
    localIpAddress: config.localIpAddress,
    networkMembership: config.networkMembership,
    keepExistingFiles: config.keepExistingFiles,
    folders: ['Blockchain', 'Blockchain/geth', 'Constellation'], 
    constellationKeySetup: [
      {folderName: 'Constellation', fileName: 'node'},
      {folderName: 'Constellation', fileName: 'nodeArch'},
    ],
    constellationConfigSetup: { 
      configName: 'constellation.config', 
      folderName: 'Constellation', 
      localIpAddress : config.localIpAddress, 
      localPort : ports.constellation,
      remoteIpAddress : null, 
      remotePort : ports.constellation,
      publicKeyFileName: 'node.pub', 
      privateKeyFileName: 'node.key', 
      publicArchKeyFileName: 'nodeArch.pub', 
      privateArchKeyFileName: 'nodeArch.key', 
    },
    "web3IPCHost": './Blockchain/geth.ipc',
    "web3RPCProvider": 'http://localhost:'+ports.gethNodeRPC
  }

  let seqFunction = async.seq(
    handleExistingFiles,
    whisper.StartCommunicationNetwork,
    handleNetworkConfiguration,
    startRaftNode,
    util.CreateWeb3Connection,
    whisper.AddEnodeResponseHandler,
    peerHandler.ListenForNewEnodes,
    whisper.AddEtherResponseHandler,
    fundingHandler.MonitorAccountBalances,
    statistics.Setup,
    whisper.ExistingRaftNetworkMembership,
    whisper.PublishNodeInformation
  )

  seqFunction(nodeConfig, function(err, res){
    if (err) { return console.log('ERROR', err) }
    console.log('[*] Done')
    cb(err, res)
  })
}

function handleStartingNewRaftNetwork(options, cb){
  config = {}
  config.localIpAddress = options.localIpAddress
  config.networkMembership = options.networkMembership
  config.keepExistingFiles = options.keepExistingFiles
  startNewRaftNetwork(config, function(err, result){
    if (err) { return console.log('ERROR', err) }
    config.raftNetwork = Object.assign({}, result)
    let networks = {
      raftNetwork: config.raftNetwork,
      communicationNetwork: config.communicationNetwork
    }
    cb(err, networks)
  })
}

exports.HandleStartingNewRaftNetwork = handleStartingNewRaftNetwork
