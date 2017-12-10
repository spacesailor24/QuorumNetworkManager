# Contents

1. Introduction & Additional functionality
2. Getting started
3. Start node from config
4. Running
5. Firewall rules
6. Constellation

# Introduction & Additional functionality

This project's goal is to help getting started with a basic Quorum network. Note that this project is still in its early days and as such, it is not production ready and is very limited in functionality. 

The Quorum Network Manager (QNM) allows users to create and manage Quorum networks easily. It currently supports creating both QuorumChain and RAFT based consensus networks. Based on a user’s consensus choice, the QNM then starts a Quorum network.

For QuorumChain consensus, a coordinator node has the option to specify the number of block makers and voters. The coordinator node then creates a genesis block based on these choices and distributes the genesis block (using Whisper) to the other peers in the network. The QNM also uses Whisper to coordinate adding peers to the network, as well as distribute ether so that peers can submit transactions.

For RAFT consensus, a coordinator node gathers peer information (enode, wallet address) via Whisper so that it can generate a genesis block (with peer wallet addresses in) and the static-node.json file. The genesis block and static-nodes.json file is distributed to peers using Whisper. The static-nodes.json file is used by RAFT to determine the index of members of the RAFT setup.

The QNM facilitates dynamic peer addition: using Whisper, the coordinating node can communicate the genesis block and the static-nodes.json file to a new peer. The QNM also collects information about new peers. The new peer’s enode is used to add it as a new peer to RAFT and its wallet address is used to send ether to the new peer.

The QNM also allows peer information sharing. Each QNM node publishes node information (Constellation key, wallet address, ip address, node public key, Whisper identity, etc.) to the Whisper network at regular intervals. Other QNM nodes then receives this information and writes it to the networkNodesInfo.json file.

Additional functionnality includes (but is not limited to) options regarding adding more blockmakers and voters, using a different consensus mechanism (e.g. switching to raft) as well as performance testing.

# Getting started

There are two options to getting started, option 1: running a script or option 2 manually following the below steps (starting at Requirements). In summary, both will create the following directory structure:

```
workspace
  quorum
  quorum-genesis
  constellation
  QuorumNetworkManager
  ...
```

## Option 1: Running the script

The latest release can be found at: https://github.com/ConsenSys/QuorumNetworkManager/releases/tag/v0.6-alpha. Please follow its install instructions.

## OR | Option 2: Installing Manually		

### Requirements

1. go 1.7.3/4/5 (this has to do with go-ethereum not working with go 1.8) - https://golang.org/dl/
2. Ubuntu 16.04 (this has to do with installing Constellation)
3. NodeJS v8.x.x (tested on v8.x.x) (refer to https://nodejs.org/en/download/package-manager/ for installation)

### Installation
Take a look at https://raw.githubusercontent.com/ConsenSys/QuorumNetworkManager/v0.6-alpha/setup.sh to see what is installed.

# Firewall rules

```
Name: raft-http
Port: TCP 40000

Name: geth-communicationNode
Port: TCP 50000

Name: geth-node
Port: TCP 20000

Name: DEVp2p
Port: TCP 30303

constellation-network
Port: TCP 9000

```

# Running from config

By setting options in the `config.js` file, users can now start a node with `node setupFromConfig.js`.

Tip1: use `killall -9 geth constellation-node` to make sure there are no other running instances of geth or constellation-node    

Tip2: start this script with `screen node setupFromConfig.js`. Detach from screen with `Ctrl + A + D`.

# Running from cli prompt

Start the QuorumNetworkManager by running `node index.js`. 

Tip: Use `screen -S QNM` in ubuntu to keep the QNM running. Detach from screen with `Ctrl + A + D`.


# Constellation

The `removeConstellation.sh` script can be used to remove constellation binaries and their entry into the `.bashrc`. Note that this script will leave the constellation directories intact (this is to prevent accidental deletion of directories if constellation wasn't installed using the `setup.sh` script).

## Upgrading Constellation

The QuorumNetworkManager upgrades constellation from `v0.0.1` to `v0.1.0` in commit [9061d3c](https://github.com/ConsenSys/QuorumNetworkManager/commit/9061d3c4144c9c9f25c607ad2a1a116f4ea81526). If you are on constellation `v0.0.1` and want to upgrade to `v0.1.0` please:

1. use a version of the QNM after [9061d3c](https://github.com/ConsenSys/QuorumNetworkManager/commit/9061d3c4144c9c9f25c607ad2a1a116f4ea81526)
2. run the `upgradeConstellationTo010.sh` script
3. run `source ~/.bashrc`



