let whisper = require('./Communication/whisperNetwork.js')
let util = require('./util.js')

let processedAccounts = []

function accountDiff(arrayA, arrayB){
  let arrayC = []
  for(let i in arrayA){
    let itemA = arrayA[i]
    let found = false
    for(let j in arrayB){
      let itemB = arrayB[j]
      if(itemA === itemB){
        found = true
      }
    }
    if(found === false){
      arrayC.push(itemA)
    }
  }
  return arrayC
}

function lookAtBalances(result, cb){
  if(util.IsWeb3RPCConnectionAlive(result.web3RPC)){
    let thresholdBalance = 0.1

    let commWeb3RPC = result.communicationNetwork.web3RPC
    let web3RPC = result.web3RPC
    //console.log("WEB3RPC", web3RPC);
    web3RPC.eth.getAccounts(async function(err, allAccounts) {
      if(err) {console.log("ERROR:", err)}
      let accounts = accountDiff(allAccounts, processedAccounts)

      for(let i in accounts){
        let account = accounts[i]
        let amount = (await web3RPC.eth.getBalance(account)).toString()
        //console.log("AMOUNT: ", amount)
        let balance = web3RPC.utils.fromWei(amount, 'ether')
        // if balance is below threshold, request topup
        if(balance < thresholdBalance){
          whisper.RequestSomeEther(commWeb3RPC, account, function(){
            processedAccounts.push(account)
          })
        }    
      }
      cb(true)
    });
  } else {
    cb(false)
  }
}

function monitorAccountBalances(result, cb){
  let web3RPC = result.web3RPC
  let intervalID = setInterval(function(){
    lookAtBalances(result, function(connectionAlive){
      if(connectionAlive == false){
        clearInterval(intervalID)
      }
    }) 
  }, 5*1000)
  cb(null, result)
}

exports.MonitorAccountBalances = monitorAccountBalances
