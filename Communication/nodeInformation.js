const fs = require('fs')

const util = require('../util.js')
var config = require('../config.js')

var messageString = require('./messageStrings.js')
var publish = messageString.Publish

var networkNodesInfo = {}

// TODO: Add to and from fields to validate origins
function publishNodeInformation(result, cb){

  let web3RPC = result.web3RPC;
  let shh = web3RPC.shh;
  let id = shh.newIdentity();

  var c = result.constellationConfigSetup
  let filePath =  c.folderName+'/'+c.publicKeyFileName
  let constellationPublicKey = fs.readFileSync(filePath, 'utf8')

  let accountList = web3RPC.eth.accounts

  let nodeInfo = {
    whisperId: id,
    nodePubKey: result.nodePubKey,
    ipAddress: result.localIpAddress,
    nodeName: config.identity.nodeName,
    address: accountList[0],
    constellationPublicKey: constellationPublicKey
  }
     
  let message = messageString.BuildDelimitedString(publish.nodeInfo, JSON.stringify(nodeInfo))

  let hexString = new Buffer(message).toString('hex')
  let postObj = messageString.BuildPostObject(['NodeInfo'], hexString, 10, 1, id)
  let intervalID = setInterval(function(){
    web3RPC.shh.post(postObj.JSON, function(err, res){
      if(err){console.log('err', err)}
    })
  }, 10*1000)

  let filter = shh.filter({"topics":["NodeInfo"]}).watch(function(err, msg) {
    if(err){console.log("ERROR:", err)}
    let message = null
    if(msg && msg.payload){
      message = util.Hex2a(msg.payload)
    }
    if(message && message.includes(publish.nodeInfo)){
      let messageTokens = message.split('|')
      let receivedInfo = JSON.parse(messageTokens[2])
      let nodePubKey = networkNodesInfo[receivedInfo.nodePubKey]
      if(nodePubKey === undefined){
        networkNodesInfo[receivedInfo.nodePubKey] = receivedInfo
        fs.writeFile('networkNodesInfo.json', JSON.stringify(networkNodesInfo), function(err){ 
          if(err) {
            console.log('ERROR:', err);
          }
        })
      } else {
        // This info is already present, no need to add to networkNodesInfo
      }
    }
  })
  cb(null, result)
}

exports.PublishNodeInformation = publishNodeInformation
