//TODO: These can be overwritten with commandline variables passed when running setupFromConfig

var config = {}

config.ports = {}
config.ports.communicationNode = 50000
config.ports.remoteCommunicationNode = 50000
config.ports.communicationNodeRPC = 50010
config.ports.gethNode = 20000 // Changing this will change the raftHttp port!
config.ports.gethNodeRPC = 20010
config.ports.raftHttp = config.ports.gethNode + 20000  // This is a requirement from raftHttp!
config.ports.devp2p = 30303
config.ports.constellation = 9000

config.identity = {}
config.identity.nodeName = 'unset'
config.identity.whisperId = null

// Change these for different setups. 
config.setup = {}
// Enter ip address as a string
config.setup.localIpAddress = '127.0.0.1'
// Only allowAll for now
config.setup.networkMembership = 'allowAll'
// Options are true or false
config.setup.keepExistingFiles = false
// Only raft supported for now
config.setup.consensus = 'raft'
// Options are coordinator, non-coordinator, dynamicPeer
config.setup.role = 'coordinator'
// Enodes that will be written to static-nodes.json if coordinator, comma separated strings
config.setup.enodeList = []
// Accounts that will be written to the genesis config if coordinator, comma separated strings
config.setup.addressList = []
// Address of the coordinator, used if this node is not the coordinator
config.setup.remoteIpAddress = '127.0.0.1'
// This is changed to true if setupFromConfig.js is used
config.setup.automatedSetup = false

module.exports = config
