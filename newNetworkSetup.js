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

function startNewQuorumNetwork(config, cb){
  console.log('[*] Starting new network...')
  
  let seqFunction = async.seq(
    util.ClearDirectories,
    util.CreateDirectories,
    whisper.StartCommunicationNetwork,
    getConfiguration,
    constellation.CreateNewKeys, 
    constellation.CreateConfig,
    util.CreateQuorumConfig,
    util.CreateGenesisBlockConfig,
    startQuorumBMAndBVNode,
    util.CreateWeb3Connection,
    whisper.AddEnodeResponseHandler,
    peerHandler.ListenForNewEnodes,
    whisper.AddEtherResponseHandler,
    fundingHandler.MonitorAccountBalances
  )

  let result = {
    localIpAddress: config.localIpAddress,
    folders: ['Blockchain', 'Constellation'], 
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
      privateArchKeyFileName: 'nodeArch.key' 
    },
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

function getBlockVoters(config, cb){
  console.log('\nSelect which block voters to use') 
  console.log('Note that the first address will be used on this node') 
  console.log('Please enter an address (starting with 0x) or enter a 1 to generate an address to use') 
  let promptArray = []
  for(let i = 0; i < config.numberOfBlockVoters; i++){
    promptArray.push('address'+i)
  }
  prompt.get(promptArray, function (err, addressList) {
    let obj = {addressList: []}
    async.eachSeries(addressList, function(address, callback){
      if(address.indexOf('1') === 0){
        util.GetNewGethAccount(obj, function(err, res){ 
          callback(err)
        })
      } else{
        obj.addressList.push(address)
        callback(null)
      }
    }, function(err){
      cb(err, obj.addressList) 
    })
  })
}

function getBlockMakers(config, cb){
  console.log('\nSelect which block makers to use') 
  console.log('Note that the first address will be used on this node') 
  console.log('Please enter an address (starting with 0x) or enter a 1 to generate an address to use') 
  let promptArray = []
  for(let i = 0; i < config.numberOfBlockMakers; i++){
    promptArray.push('address'+i)
  }
  prompt.get(promptArray, function (err, addressList) {
    let obj = {addressList: []}
    async.eachSeries(addressList, function(address, callback){
      if(address.indexOf('1') === 0){
        util.GetNewGethAccount(obj, function(err, obj){ 
          callback(err)
        })
      } else{
        obj.addressList.push(address)
        callback(null)
      }
    }, function(err){
      cb(err, obj.addressList) 
    })
  })
}

function getConfiguration(result, cb){
  console.log('Please enter the configuration for this network:')
  prompt.get([
    'numberOfBlockVoters', 
    'numberOfBlockMakers', 
    'minimumTimeBetweenBlocks', 
    'maximumTimeBetweenBlocks', 
    'minimumNumberOfRequiredVoters' 
    ]
  , function (err, config) {
    if(err){console.log('ERROR:', err)}
    result.threshold = config.minimumNumberOfRequiredVoters
    result.minBlockTime = config.minimumTimeBetweenBlocks
    result.maxBlockTime = config.maximumTimeBetweenBlocks

    getBlockMakers(config, function(err, blockMakers){
      if(err){console.log('ERROR:', err)}
      result.blockMakers = blockMakers
      getBlockVoters(config, function(err, blockVoters){
        if(err){console.log('ERROR:', err)}
        result.blockVoters = blockVoters
        cb(err, result) 
      })
    })
  })
}

function handleStartingNewQuorumNetwork(localIpAddress, cb){
  config = {}
  config.localIpAddress = localIpAddress
  startNewQuorumNetwork(config, function(err, result){
    if (err) { return console.log('ERROR', err) }
    config.quorumNetwork = Object.assign({}, result)
    let networks = {
      quorumNetwork: config.quorumNetwork,
      communicationNetwork: config.quorumNetwork.communicationNetwork
    }
    networks.quorumNetwork.localIpAddress = localIpAddress
    networks.communicationNetwork.localIpAddress = localIpAddress
    cb(err, networks)
  })
}

exports.HandleStartingNewQuorumNetwork = handleStartingNewQuorumNetwork
