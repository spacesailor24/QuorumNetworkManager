var exec = require('child_process').exec;
var ps = require('ps-node')
var fs = require('fs');
var async = require('async')
var prompt = require('prompt')
prompt.start();

var ports = require('./config.js').ports
let setup = require('./config.js').setup

let constellation = require('./constellation.js')

function killallGethConstellationNode(cb){
  var cmd = 'killall -9';
  cmd += ' geth';
  cmd += ' constellation-node';
  var child = exec(cmd, function(){
    cb(null, null);
  });
  child.stderr.on('data', function(error){
    console.log('ERROR:', error);
    cb(error, null);
  });
}

function clearDirectories(result, cb){
  var cmd = 'rm -rf';
  for(var i in result.folders){
    var folder = result.folders[i];
    cmd += ' '+folder;    
  }
  var child = exec(cmd, function(){
    cb(null, result);
  });
  child.stderr.on('data', function(error){
    console.log('ERROR:', error);
    cb(error, null);
  });
}

function createDirectories(result, cb){
  var cmd = 'mkdir';
  for(var i in result.folders){
    var folder = result.folders[i];
    cmd += ' '+folder;    
  }
  var child = exec(cmd, function(){
    cb(null, result);
  });
  child.stderr.on('data', function(error){
    console.log('ERROR:', error);
    cb(error, null);
  });
}

function hex2a(hexx) {
  var hex = hexx.toString();//force conversion
  var str = '';
  for (var i = 0; i < hex.length; i += 2){
    str += String.fromCharCode(parseInt(hex.substr(i, 2), 16));
  }
  return str;
}

// TODO: Add failure after a number of retries
function waitForIPCPath(path, cb){
  if (fs.existsSync(path)) {
    cb()
  } else {
    setTimeout(function(){
      waitForIPCPath(path, cb)
    }, 1000)
  }
}

function createWeb3IPC(ipcProvider){
  let Web3IPC = require('web3_ipc');
  let options = {
    host: ipcProvider,
    ipc: true,
    personal: true,
    admin: true,
    debug: false
  };
  let web3IPC = Web3IPC.create(options);
  let web3IPCConnection = web3IPC.currentProvider.connection
  return web3IPC
}

function waitForRPCConnection(web3RPC, cb){
  web3RPC.eth.net.isListening(function(err, isListening){
    if(isListening === true){
      console.log('[*] RPC connection established')
      cb()
    } else {
      setTimeout(function(){
        console.log('waiting for RPC connection ...')
        waitForRPCConnection(web3RPC, cb)
      }, 1000)
    }
  })
}

// TODO: add error handler here for web3 connections so that program doesn't exit on error
function createWeb3Connection(result, cb){
  let ipcProvider = result.web3IPCHost;
  waitForIPCPath(ipcProvider, function(){
    // Web3 WS RPC
    let web3WSRPC
    if(result.web3WSRPCProvider){
      let wsProvider = result.web3WSRPCProvider;
      let Web3 = require('web3');
      web3WSRPC = new Web3(wsProvider);
      result.web3WSRPC = web3WSRPC;
    }
    // Web3 http RPC
    let httpProvider = result.web3RPCProvider;
    let Web3HttpRPC = require('web3');
    let web3HttpRPC = new Web3HttpRPC(httpProvider);
    result.web3HttpRPC = web3HttpRPC
    waitForRPCConnection(result.web3HttpRPC, function(){
      result.web3IPC = createWeb3IPC(ipcProvider)
      if(result.consensus === 'raft'){
        let Web3Raft = require('web3-raft');
        let web3HttpRaft = new Web3Raft(httpProvider);
        result.web3HttpRaft = web3HttpRaft;
      }
      console.log('[*] Node started')
      cb(null, result);
    })
  })
}

function connectToPeer(result, cb){
  var enode = result.enode;
  result.web3IPC.admin.addPeer(enode, function(err, res){
    if(err){console.log('ERROR:', err);}
    cb(null, result);
  });
}

function getNewGethAccount(result, cb){
  var options = {encoding: 'utf8', timeout: 10*1000};
  var child = exec('geth --datadir Blockchain account new', options);
  child.stdout.on('data', function(data){
    if(data.indexOf('Your new account') >= 0){
      child.stdin.write('\n');
    } else if(data.indexOf('Repeat') >= 0){
      child.stdin.write('\n');
    } else if(data.indexOf('Address') == 0){
      var index = data.indexOf('{');
      var address = '0x'+data.substring(index+1, data.length-2);
      if(result.addressList == undefined){
        result.addressList = [];
      }
      result.addressList.push(address);
      cb(null, result);
    } 
  });
  child.stderr.on('data', function(error){
    if(error.indexOf('No etherbase set and no accounts found as default') < 0){
      console.log('ERROR:', error);
      cb(error, null);
    }
  });
}

function instanceAlreadyRunningMessage(processName){
  console.log('\n--- NOTE: There is an instance of '+processName+' already running.'+
    ' Please kill this instance by selecting option 5 before continuing\n')
}

function checkPreviousCleanExit(cb){
  async.parallel({
    geth: function(callback){
      ps.lookup({
        command: 'geth',
        psargs: 'ef'
      }, 
      function(err, resultList){
        callback(err, resultList)
      })
    }, 
    constellation: function(callback){
      ps.lookup({
        command: 'constellation-node',
        psargs: 'ef'
      }, 
      function(err, resultList){
        callback(err, resultList)
      })
    } 
  }, function(err, result){
    if(result && result.geth && result.geth.length > 0){
      instanceAlreadyRunningMessage('geth')
    }
    if(result && result.constellation && result.constellation.length > 0){
      instanceAlreadyRunningMessage('constellation')
    }
    cb(err, true)
  })
}

function createRaftGenesisBlockConfig(result, cb){
  let genesisTemplate = {
    "alloc": {},
    "coinbase": result.blockMakers[0],
    "config": {
      "homesteadBlock": 0,
      "chainId": 1,
      "eip155Block": null,
      "eip158Block": null,
      "isQuorum": true
    },
    "difficulty": "0x0",
    "extraData": "0x0000000000000000000000000000000000000000000000000000000000000000",
    "gasLimit": "0xE0000000",
    "mixhash": "0x00000000000000000000000000000000000000647572616c65787365646c6578",
    "nonce": "0x0",
    "parentHash": "0x0000000000000000000000000000000000000000000000000000000000000000",
    "timestamp": "0x00"
  }

  for(let key in result.blockMakers){
    genesisTemplate.alloc[result.blockMakers[key]] = {
      "balance": "1000000000000000000000000000"
    }
  }

  let genesisConfig = JSON.stringify(genesisTemplate)

  fs.writeFile('quorum-genesis.json', genesisConfig, 'utf8', function(err, res){
    result.communicationNetwork.genesisBlockConfigReady = true;
    cb(err, result);
  })
}

function createIstanbulGenesisBlockConfig(result, cb){
  let genesisTemplate = {
    "alloc": {
      "0x0000000000000000000000000000000000000020": {
        "code": "0x606060405236156100c45760e060020a60003504631290948581146100c9578063284d163c146100f957806342169e4814610130578063488099a6146101395780634fe437d514610154578063559c390c1461015d57806368bb8bb61461025d57806372a571fc146102c857806386c1ff681461036957806398ba676d146103a0578063a7771ee31461040b578063adfaa72e14610433578063cf5289851461044e578063de8fa43114610457578063e814d1c71461046d578063f4ab9adf14610494575b610002565b610548600435600160a060020a03331660009081526003602052604090205460ff16156100c45760018190555b50565b610548600435600160a060020a03331660009081526005602052604090205460ff16156100c4576004546001141561055e57610002565b61045b60025481565b61054a60043560056020526000908152604090205460ff1681565b61045b60015481565b61045b60043560006000600060006000600050600186038154811015610002579080526002027f290decd9548b62a8d60345a988386fc84ba6bc95484008f6362f93160ef3e5630192505b60018301548110156105d75760018301805484916000918490811015610002576000918252602080832090910154835282810193909352604091820181205485825292869052205410801561023257506001805490840180548591600091859081101561000257906000526020600020900160005054815260208101919091526040016000205410155b156102555760018301805482908110156100025760009182526020909120015491505b6001016101a8565b610548600435602435600160a060020a03331660009081526003602052604081205460ff16156100c4578054839010156105e45780548084038101808355908290829080158290116105df576002028160020283600052602060002091820191016105df919061066b565b610548600435600160a060020a03331660009081526005602052604090205460ff16156100c457600160a060020a0381166000908152604090205460ff1615156100f65760406000819020805460ff191660019081179091556004805490910190558051600160a060020a038316815290517f1a4ce6942f7aa91856332e618fc90159f13a340611a308f5d7327ba0707e56859181900360200190a16100f6565b610548600435600160a060020a03331660009081526003602052604090205460ff16156100c4576002546001141561071457610002565b61045b600435602435600060006000600050600185038154811015610002579080526002027f290decd9548b62a8d60345a988386fc84ba6bc95484008f6362f93160ef3e5630181509050806001016000508381548110156100025750825250602090200154919050565b61054a600435600160a060020a03811660009081526003602052604090205460ff165b919050565b61054a60043560036020526000908152604090205460ff1681565b61045b60045481565b6000545b60408051918252519081900360200190f35b61054a600435600160a060020a03811660009081526005602052604090205460ff1661042e565b610548600435600160a060020a03331660009081526003602052604090205460ff16156100c457600160a060020a03811660009081526003602052604090205460ff1615156100f65760406000818120600160a060020a0384169182905260036020908152815460ff1916600190811790925560028054909201909155825191825291517f0ad2eca75347acd5160276fe4b5dad46987e4ff4af9e574195e3e9bc15d7e0ff929181900390910190a16100f6565b005b604080519115158252519081900360200190f35b600160a060020a03811660009081526005602052604090205460ff16156100f65760406000819020805460ff19169055600480546000190190558051600160a060020a038316815290517f8cee3054364d6799f1c8962580ad61273d9d38ca1ff26516bd1ad23c099a60229181900360200190a16100f6565b509392505050565b505050505b60008054600019850190811015610002578382526002027f290decd9548b62a8d60345a988386fc84ba6bc95484008f6362f93160ef3e563016020819052604082205490925014156106b8578060010160005080548060010182818154818355818115116106a5578183600052602060002091820191016106a5919061068d565b50506002015b808211156106a157600181018054600080835591825260208220610665918101905b808211156106a1576000815560010161068d565b5090565b5050506000928352506020909120018290555b600082815260208281526040918290208054600101905581514381529081018490528151600160a060020a033316927f3d03ba7f4b5227cdb385f2610906e5bcee147171603ec40005b30915ad20e258928290030190a2505050565b600160a060020a03811660009081526003602052604090205460ff16156100f65760406000819020805460ff19169055600280546000190190558051600160a060020a038316815290517f183393fc5cffbfc7d03d623966b85f76b9430f42d3aada2ac3f3deabc78899e89181900360200190a16100f656",
        "storage": {
          "0x0000000000000000000000000000000000000000000000000000000000000001": "0x02",

          "0x0000000000000000000000000000000000000000000000000000000000000002": "0x04",
          "0x29ecdbdf95c7f6ceec92d6150c697aa14abeb0f8595dd58d808842ea237d8494": "0x01",
          "0x6aa118c6537572d8b515a9f9154be55a3377a8de7991cd23bf6e5ceb368688e3": "0x01",
          "0x50793743212c6f01d326957d7069005b912f8215f10c7536be6b10782c6c44cd": "0x01",
          "0x38f6c908c5cc7ca668cec2f476abe61b4dbb1df20f0ad8e07ef5dbf6a2f1ffd4": "0x01",

          "0x0000000000000000000000000000000000000000000000000000000000000004": "0x02",
          "0xaca3b76ed4968740c3180dd7fa37f4aa229a2c758a848f53920e9ccb4c4bb74e": "0x01",
          "0xd188ba2dc293670542c1befaf7678b0859e5354a0727d1188b2afb6f47fe24d1": "0x01"
        },
        "balance": "1000000000000000000000000000"
      }
    },
    "coinbase": "0x0000000000000000000000000000000000000000",
    "config": {
      "homesteadBlock": 1,
      "eip150Block": 2,
      "eip150Hash": "0x0000000000000000000000000000000000000000000000000000000000000000",
      "eip155Block": 3,
      "eip158Block": 3,
      "istanbul": {
        "epoch": 30000,
        "policy": 0
      },
      "isQuorum": true
    },
    "difficulty": "0x1",
    "extraData": "0x0000000000000000000000000000000000000000000000000000000000000000f897f893946571d97f340c8495b661a823f2c2145ca47d63c2948157d4437104e3b8df4451a85f7b2438ef6699ff94b131288f355bc27090e542ae0be213c20350b76794b912de287f9b047b4228436e94b5b78e3ee1617194d8dba507e85f116b1f7e231ca8525fc9008a696694e36cbeb565b061217930767886474e3cde903ac594f512a992f3fb749857d758ffda1330e590fa915e80c0",
    "gasLimit": "0xE0000000",
    "mixhash": "0x63746963616c2062797a616e74696e65206661756c7420746f6c6572616e6365",
    "nonce": "0x0",
    "parentHash": "0x0000000000000000000000000000000000000000000000000000000000000000",
    "timestamp": "0x00"
  }

  for(let key in result.blockMakers){
    genesisTemplate.alloc[result.blockMakers[key]] = {
      "balance": "1000000000000000000000000000"
    }
  }

  let genesisConfig = JSON.stringify(genesisTemplate)

  fs.writeFile('quorum-genesis.json', genesisConfig, 'utf8', function(err, res){
    result.communicationNetwork.genesisBlockConfigReady = true;
    cb(err, result);
  })
}

function isWeb3RPCConnectionAlive(web3RPC){
  let isAlive = false
  try{
    let accounts = web3RPC.eth.accounts
    if(accounts){
      isAlive = true
    }
  } catch(err){ } 
  return isAlive 
}

function getEnodePubKey(cb){
  let options = {encoding: 'utf8', timeout: 10*1000};
  let child = exec('bootnode -nodekey Blockchain/geth/nodekey -writeaddress', options)
  child.stdout.on('data', function(data){
    data = data.slice(0, -1)
    cb(null, data)
  })
  child.stderr.on('data', function(error){
    console.log('ERROR:', error)
    cb(error, null)
  })
}

function generateEnode(result, cb){
  var options = {encoding: 'utf8', timeout: 10*1000};
  console.log('Generating node key')
  var child = exec('bootnode -genkey Blockchain/geth/nodekey', options)
  child.stderr.on('data', function(error){
    console.log('ERROR:', error)
  })
  child.stdout.on('close', function(error){
    getEnodePubKey(function(err, pubKey){
      let enode = 'enode://'+pubKey+'@'+result.localIpAddress+':'+ports.gethNode+
        '?raftport='+ports.raftHttp
      result.nodePubKey = pubKey
      result.enodeList = [enode]
      cb(null, result)
    })
  })
}

function displayEnode(result, cb){
  let options = {encoding: 'utf8', timeout: 10*1000};
  let child = exec('bootnode -nodekey Blockchain/geth/nodekey -writeaddress', options)
  child.stdout.on('data', function(data){
    data = data.slice(0, -1)
    let enode = 'enode://'+data+'@'+result.localIpAddress+':'+ports.gethNode+'?raftport='+ports.raftHttp
    console.log('\nenode:', enode+'\n')
    //result.nodePubKey = data
    //result.enodeList = [enode] // TODO: investigate why this is a list
    cb(null, result)
  })
  child.stderr.on('data', function(error){
    console.log('ERROR:', error)
    cb(error, null)
  })
}

function displayCommunicationEnode(result, cb){
  if(!result){
    return cb({error: 'parameter not defined, could not get ip address'}, null)
  }
  var options = {encoding: 'utf8', timeout: 10*1000};
  var child = exec('bootnode -nodekey CommunicationNode/geth/nodekey -writeaddress', options)
  child.stdout.on('data', function(data){
    data = data.slice(0, -1)
    let enode = 'enode://'+data+'@'+result.localIpAddress+':'
      +ports.communicationNode
    console.log('\n', enode+'\n')
    result.nodePubKey = data
    result.enodeList = [enode]
    cb(null, result)
  })
  child.stderr.on('data', function(error){
    console.log('ERROR:', error)
    cb(error, null)
  })
}

function handleExistingFiles(result, cb){
  if(result.keepExistingFiles == false){ 
    let seqFunction = async.seq(
      clearDirectories,
      createDirectories,
      generateEnode,    
      displayEnode
    )
    seqFunction(result, function(err, res){
      if (err) { return console.log('ERROR', err) }
      cb(null, res)
    })
  } else {
    cb(null, result)
  }
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

function handleNetworkConfiguration(result, cb){
  if(result.keepExistingFiles == false){ 
    let createGenesisBlockConfig = null
    if(result.consensus === 'raft'){
      createGenesisBlockConfig = createRaftGenesisBlockConfig
    } else if(result.consensus === 'istanbul') {
      createGenesisBlockConfig = createIstanbulGenesisBlockConfig
    } else {
      console.log('ERROR in handleNetworkConfiguration: Unknown consensus choice')
      cb(null, null)
    }

    let seqFunction = async.seq(
      getConfiguration,
      getNewGethAccount,
      addAddresslistToQuorumConfig,
      createGenesisBlockConfig,
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

exports.Hex2a = hex2a
exports.ClearDirectories = clearDirectories
exports.CreateDirectories = createDirectories
exports.CreateWeb3Connection = createWeb3Connection
exports.ConnectToPeer = connectToPeer
exports.KillallGethConstellationNode = killallGethConstellationNode
exports.GetNewGethAccount = getNewGethAccount
exports.CheckPreviousCleanExit = checkPreviousCleanExit
exports.CreateRaftGenesisBlockConfig = createRaftGenesisBlockConfig
exports.IsWeb3RPCConnectionAlive = isWeb3RPCConnectionAlive
exports.GenerateEnode = generateEnode
exports.DisplayEnode = displayEnode
exports.DisplayCommunicationEnode = displayCommunicationEnode
exports.handleExistingFiles = handleExistingFiles
exports.handleNetworkConfiguration = handleNetworkConfiguration
