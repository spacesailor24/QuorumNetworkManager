let async = require('async')
let exec = require('child_process').exec
let prompt = require('prompt')

let whisper = require('./Communication/whisperNetwork.js')
let util = require('./util.js')
let constellation = require('./constellation.js')
let peerHandler = require('./peerHandler.js')
let fundingHandler = require('./fundingHandler.js')
let ports = require('./config.js').ports

prompt.start()

function joinNewQuorumNetwork(config, cb){
  console.log('[*] Joining existing quorum network...');

  let startNode = null
  if(config.joinOption == 0){
    startNode = startQuorumBMAndBVNode
  } else if(config.joinOption == 1) {
    startNode = startQuorumBMNode
  } else if(config.joinOption == 2){
    startNode = startQuorumBVNode
  } else {
    startNode = startQuorumParticipantNode
  }
  
    //whisper.AddEtherResponseHandler,
  let seqFunction = async.seq(
    util.ClearDirectories,
    util.CreateDirectories,
    getConfiguration,
    constellation.CreateNewKeys, 
    constellation.CreateConfig,
    whisper.GetGenesisBlockConfig,
    startNode,
    util.CreateWeb3Connection,
    peerHandler.ListenForNewEnodes,
    whisper.AddEnodeRequestHandler,
    whisper.AddEnodeResponseHandler,
    peerHandler.ListenForNewEnodes,
    fundingHandler.MonitorAccountBalances
  )
  let result = {
    joinOption: config.joinOption,
    localIpAddress: config.localIpAddress,
    folders: ['Blockchain', 'Constellation'],
    constellationKeySetup: [
      {folderName: 'Constellation', fileName: 'node'},
      {folderName: 'Constellation', fileName: 'nodeArch'}
    ],
    constellationConfigSetup: { 
      configName: 'constellation.config', 
      folderName: 'Constellation', 
      localIpAddress : config.localIpAddress, 
      localPort : ports.constellation, 
      remoteIpAddress : config.remoteIpAddress, 
      remotePort : ports.constellation, 
      publicKeyFileName: 'node.pub', 
      privateKeyFileName: 'node.key', 
      publicArchKeyFileName: 'nodeArch.pub', 
      privateArchKeyFileName: 'nodeArch.key', 
    },
    communicationNetwork: config.communicationNetwork,
    "web3IPCHost": './Blockchain/geth.ipc',
    "web3RPCProvider": 'http://localhost:'+ports.gethNodeRPC
  }
  seqFunction(result, function(err, res){
    if (err) { return console.log('ERROR', err) }
    console.log('[*] New network started')
    cb(err, res)
  })
}

function startQuorumBMAndBVNode(result, cb){
  console.log('[*] Started node as BM + BV')
  let options = {encoding: 'utf8', timeout: 100*1000}
  let cmd = './startQuorumBMAndBVNode.sh'
  cmd += ' '+result.blockVoters[0]
  cmd += ' '+result.blockMakers[0]
  cmd += ' '+result.minBlockTime
  cmd += ' '+result.maxBlockTime
  cmd += ' '+ports.gethNodeRPC
  cmd += ' '+ports.gethNode
  let child = exec(cmd, options)
  child.stdout.on('data', function(data){
    cb(null, result)
  })
  child.stderr.on('data', function(error){
    console.log('ERROR:', error)
    cb(error, null)
  })
}

function startQuorumBMNode(result, cb){
  let options = {encoding: 'utf8', timeout: 100*1000}
  let cmd = './startQuorumBMNode.sh'
  cmd += ' '+result.blockMakers[0]
  cmd += ' '+result.minBlockTime
  cmd += ' '+result.maxBlockTime
  cmd += ' '+ports.gethNodeRPC
  cmd += ' '+ports.gethNode
  let child = exec(cmd, options)
  child.stdout.on('data', function(data){
    cb(null, result)
  })
  child.stderr.on('data', function(error){
    console.log('ERROR:', error)
    cb(error, null)
  })
}

function startQuorumBVNode(result, cb){
  let options = {encoding: 'utf8', timeout: 100*1000}
  let cmd = './startQuorumBVNode.sh'
  cmd += ' '+result.blockVoters[0]
  cmd += ' '+result.minBlockTime
  cmd += ' '+result.maxBlockTime
  cmd += ' '+ports.gethNodeRPC
  cmd += ' '+ports.gethNode
  let child = exec(cmd, options)
  child.stdout.on('data', function(data){
    cb(null, result)
  })
  child.stderr.on('data', function(error){
    console.log('ERROR:', error)
    cb(error, null)
  })
}

function startQuorumParticipantNode(result, cb){
  console.log('Starting quorum participant node...');
  var options = {encoding: 'utf8', timeout: 100*1000};
  var cmd = './startQuorumParticipantNode.sh';
  cmd += ' '+ports.gethNodeRPC
  cmd += ' '+ports.gethNode
  var child = exec(cmd, options);
  child.stdout.on('data', function(data){
    console.log('Started quorum participant node');
    cb(null, result);
  });
  child.stderr.on('data', function(error){
    console.log('ERROR:', error);
    cb(error, null);
  });
}

function getAddress(cb){
  console.log('Please enter either: '
    +'\n1) an address (starting with 0x) '
    +'\n2) a 1 to generate an address to use' 
    +'\n3) a 0 to not participate in this role') 
  let address = ''
  prompt.get(['address'], function (err, answer) {
    if(answer.address.indexOf('1') === 0){
      console.log('generating new address...')
      util.GetNewGethAccount({}, function(err, res){ 
        address = res.addressList[0] 
        cb(err, address) 
      })
    } else if(answer.address.indexOf('0x') === 0){
      address = answer.address
      cb(err, address) 
    } else{
      address = null
      cb(err, address) 
    }
  })
}

function getConfiguration(result, cb){
  if(result.joinOption == 0 || result.joinOption == 1 || result.joinOption == 2){
    console.log('Please enter the configuration for this network:')
    prompt.get(['minimumTimeBetweenBlocks', 'maximumTimeBetweenBlocks']
    , function (err, config) {
      if(err){console.log('ERROR:', err)}
      result.minBlockTime = config.minimumTimeBetweenBlocks
      result.maxBlockTime = config.maximumTimeBetweenBlocks

      if(result.joinOption == 0){
        console.log('\nSelect which block maker to use') 
        getAddress(function(err, blockMaker){
          if(err){console.log('ERROR:', err)}
          result.blockMakers = [blockMaker]
          console.log('Please use '+blockMaker + ' as your block maker address')

          console.log('\nSelect which block voter to use') 
          getAddress(function(err, blockVoter){
            if(err){console.log('ERROR:', err)}
            result.blockVoters = [blockVoter]
            console.log('Please use '+blockVoter + ' as your block voter address')
            cb(err, result) 
          })
        })
      } else if(result.joinOption == 1) {
        console.log('\nSelect which block maker to use') 
        getAddress(function(err, blockMaker){
          if(err){console.log('ERROR:', err)}
          result.blockMakers = [blockMaker]
          console.log('Please use '+blockMaker + ' as your block maker address')
          cb(err, result) 
        })
      } else if(result.joinOption == 2){
        console.log('\nSelect which block voter to use') 
        getAddress(function(err, blockVoter){
          if(err){console.log('ERROR:', err)}
          result.blockVoters = [blockVoter]
          console.log('Please use '+blockVoter + ' as your block voter address')
          cb(err, result) 
        })
      }
    })
  } else {
    cb(null, result)
  }
}

function handleJoiningNewQuorumNetwork(localIpAddress, cb){
  config = {}
  config.localIpAddress = localIpAddress
  console.log('\nIn order to join an existing network, please enter either:'+
    '\n1) the ip address of the coordinating node'+
    '\n2) a communication network enode of any other node on the network')
  prompt.get(['connection'], function (err, network) {

    if(network && network.connection.indexOf('enode') >= 0){
      let startOfIpAddress = network.connection.indexOf('@') 
      let endOfIpAddress = network.connection.indexOf(':', startOfIpAddress) 
      let ipAddress = network.connection.substring(startOfIpAddress+1, endOfIpAddress) 
      console.log('ipAddress:', ipAddress)
      config.remoteIpAddress = ipAddress
      config.remoteEnode = network.connection
    } else {
      config.remoteIpAddress = network.connection
      config.remoteEnode = null
    }

    console.log('Please select an option:')
    console.log('0) Join the network as a block maker and block voter')
    console.log('1) Join the network as a block maker')
    console.log('2) Join the network as a block voter')
    console.log('3) Join the network as a participant')
    prompt.get(['option'], function (err, answer) {
      config.joinOption = answer.option

      whisper.JoinCommunicationNetwork(config, function(err, result){
        if (err) { return console('ERROR:', err) }
        config.communicationNetwork = Object.assign({}, result)
        joinNewQuorumNetwork(config, function(err, result){
          if (err) { return console.log('ERROR:', err) }
          let networks = {
            quorumNetwork: Object.assign({}, result),
            communicationNetwork: config.communicationNetwork
          }
          networks.quorumNetwork.localIpAddress = localIpAddress
          networks.communicationNetwork.localIpAddress = localIpAddress
          cb(err, networks)
        })
      })
    })
  })
}

exports.HandleJoiningNewQuorumNetwork = handleJoiningNewQuorumNetwork
