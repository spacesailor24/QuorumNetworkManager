# Contents

1. Introduction & Additional functionality
2. Getting started
3. Start node from config
4. Running
5. Firewall rules
6. Constellation

# Introduction & Additional functionality

This project's goal is to help getting started with a basic Quorum network. Note that this project is still in its early days and as such, it is not production ready and is very limited in functionality. 

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

This script `setup.sh` needs to be run from the folder where you want the QuorumNetworkManager to be installed, like your workspace:

1. `mkdir workspace && cd $_`
2. `wget https://raw.githubusercontent.com/ConsenSys/QuorumNetworkManager/master/setup.sh`
3. `chmod +x setup.sh`
4. `./setup.sh`
5. `source ~/.bashrc`

Optionally, run  
`sed -i '/console.log(val);/d' QuorumNetworkManager/node_modules/web3_ipc/index.js`  
to get rid of some unwanted logging of `true` when adding peers.

This will install all the requirements as well as all the below getting started steps

## OR | Option 2: Installing Manually		
 		
### Requirements

1. go 1.7.3/4/5 (this has to do with go-ethereum not working with go 1.8) - https://golang.org/dl/
2. Ubuntu 16.04 (this has to do with installing Constellation)
3. NodeJS v8.x.x (tested on v8.x.x) (refer to https://nodejs.org/en/download/package-manager/ for installation)

### Installing Ethereum
    
 NOTE: There seems to be a problem with web3 if we don't install ethereum, we still need to find the exact package
 web3 is missing and simply install that package instead.
  		
 1. `sudo apt-get install software-properties-common`		
 2. `sudo add-apt-repository -y ppa:ethereum/ethereum`		
 3. `sudo apt-get update`		
 4. `sudo apt-get install ethereum`

### Installing Quorum

NOTE: We will need to use Quorum's geth, so do a `sudo mv /usr/bin/geth /usr/bin/normalGeth`

Installation guide for https://github.com/jpmorganchase/quorum

NOTE: This should replace your currently installed `geth`. 

1. `sudo apt-get install -y build-essential`
2. `git clone https://github.com/jpmorganchase/quorum.git`
3. `cd quorum`
4. `make all`
5. Add /build/bin to your PATH: `echo "PATH=\$PATH:"$PWD/build/bin >> ~/.bashrc`
6. `source ~/.bashrc`

### Installing Constellation

Installation guide for https://github.com/jpmorganchase/constellation

1. `mkdir -p constellation && cd constellation/`
2. `sudo apt-get install -y unzip libdb-dev libleveldb-dev libsodium-dev zlib1g-dev libtinfo-dev`
3. `wget https://github.com/jpmorganchase/constellation/releases/download/v0.1.0/constellation-0.1.0-ubuntu1604.tar.xz -O constellation-0.1.0-ubuntu1604.tar.xz`
4. `tar -xf constellation-0.1.0-ubuntu1604.tar.xz`
5. `chmod +x constellation-0.1.0-ubuntu1604/constellation-node`
6. `echo "PATH=\$PATH:"$PWD/constellation-0.1.0-ubuntu1604 >> ~/.bashrc`
7. `source ~/.bashrc`

### Installing Quorum Genesis

Installation guide for https://github.com/davebryson/quorum-genesis

NOTE: the public-key (use ssh-keygen to generate one) of the machine you are working on will have to be added to your github account to clone this repo via ssh

1. `git clone git@github.com:davebryson/quorum-genesis.git`
2. `cd quorum-genesis`
3. `sudo npm install -g`

### Installing the QuorumNetworkManager

1. `git clone git@github.com:coeniebeyers/QuorumNetworkManager.git`
2. `cd QuorumNetworkManager`
3. `npm install`

Optionally, run  
`sed -i '/console.log(val);/d' node_modules/web3_ipc/index.js`  
to get rid of some unwanted logging of `true` when adding peers.

# Start node from config

By setting options in the `config.js` file, users can now start a node with `node setupFromConfig.js`.

Tip1: use `killall -9 geth constellation-node` to make sure there are no other running instances of geth or constellation-node    

Tip2: start this script with `screen node setupFromConfig.js`. Detach from screen with `Ctrl + A + D`.

# Running

Start the QuorumNetworkManager by running `node index.js`. 

Tip: Use `screen -S QNM` in ubuntu to keep the QNM running. Detach from screen with `Ctrl + A + D`.

## Starting a raft network

Raft supports two modes of starting/joining the network, 1) during the initial setup phase, and 2) afterwords. 

Consider the scenario where you have 3 nodes (node1, node2, and node3) in total, 2 will be part of the initial setup and 1 will be added later. 

### Initial setup phase

We will pick node 1 to coordinate the initial setup phase. Run the following on node 1

```
$ node index.js 
Trying to get public ip address, please wait a few seconds...
Welcome! 

Please enter the IP address other nodes will use to connect to this node. 

Also, please enter a publicly identifyable string for this node to use.
```
Next, check that the below ip address is the one you want other nodes to connect to
```
prompt: localIpAddress:  (192.168.0.100) 
```
Enter a node name to identify this node
```
prompt: nodeName:  node1
```
Next, select option 1 to start a raft network
```
Please select an option:
1) Raft
2) QuorumChain
5) Kill all geth and constellation
prompt: option:  1
```
Select option 1, as this is the coordinating node
```
Please select an option below:
1) Start a new network as the coordinator [WARNING: this clears everything]
2) Start a new network as a non-coordinator [WARNING: this clears everything]
3) Join already running raft network [WARNING: this clears everything]
4) TODO: Start whisper services and attach to already running node
5) killall geth constellation-node
0) Quit
prompt: option:  1
```
Select option 1 to allow anyone to connect
```
Please select an option below:
1) Allow anyone to connect
2) [TODO] Allow only people with pre-auth tokens to connect
prompt: option:  1
[*] Starting new network...
Generating node key

enode: enode://9dea0f5ddae8be3ba8a6546c31aa47bedd7bc8a19d6f9ff8ae23524e8d71dcbd246be29e74077aa87d86cd98bb72402d5944fd42b92c1a132cf36d0a0dde3a1f@192.168.0.100:20000?raftport=40000

[*] Starting communication network...
[*] New communication network started
Please wait for others to join. Hit any key + enter once done.
prompt: done:  
```
At this point we need to switch to node 2 
```
$ node index.js 
Trying to get public ip address, please wait a few seconds...
Welcome! 

Please enter the IP address other nodes will use to connect to this node. 

Also, please enter a publicly identifyable string for this node to use.


prompt: localIpAddress:  (192.168.0.101) 
prompt: nodeName:  node2
Please select an option:
1) Raft
2) QuorumChain
5) Kill all geth and constellation
prompt: option: 1
```
Note we pick option 2 here:
```
Please select an option below:
1) Start a new network as the coordinator [WARNING: this clears everything]
2) Start a new network as a non-coordinator [WARNING: this clears everything]
3) Join already running raft network [WARNING: this clears everything]
4) TODO: Start whisper services and attach to already running node
5) killall geth constellation-node
0) Quit
prompt: option:  2
```
Next, we need to enter the ip address of the coordinating node, node1:
```
In order to join the network, please enter the ip address of the coordinating node
prompt: ipAddress:  192.168.0.100
[*] Joining communication network...
true
[*] Communication network started
[*] Starting new network...
Account: 0x921ff462ae37f67b5feb1d7201f4494819e9c28c
Generating node key

enode: enode://bc2d0b485b925ae3234f7b67861bcbbfc48550056d4ce0948ef1654518cab3e5fa987c73034f257b6142de7b64316b90de1376fc8ca9e6e916422d676a68b539@192.168.0.101:20000?raftport=40000

[*] Requesting network membership. This will block until the other node responds
```
Back on node1, we will see the following after a couple of seconds:
```
node2 has joined the network
```
and node2 will display:
```
[*] Network membership: ACCEPTED
[*] Requesting genesis block config. This will block until the other node is online
```
Next, hit any key + enter on node 1:
```
prompt: done:  node2 has joined the network
p
[*] Creating genesis config...
[INFO] Unlocking all accounts ...
true
[INFO] All accounts unlocked
[*] New network started
[*] Network started
Please select an option below:
1) Start a new network as the coordinator [WARNING: this clears everything]
2) Start a new network as a non-coordinator [WARNING: this clears everything]
3) Join already running raft network [WARNING: this clears everything]
4) TODO: Start whisper services and attach to already running node
5) killall geth constellation-node
0) Quit
prompt: option: 
```
node2 will output:
```
received genesis config
[*] Requesting static nodes file. This will block until the other node is online
received static nodes file
[INFO] Unlocking all accounts ...
true
[INFO] All accounts unlocked
[*] New network started
Please select an option below:
1) Start a new network as the coordinator [WARNING: this clears everything]
2) Start a new network as a non-coordinator [WARNING: this clears everything]
3) Join already running raft network [WARNING: this clears everything]
4) TODO: Start whisper services and attach to already running node
5) killall geth constellation-node
0) Quit
prompt: option:  
```

You now have two connected nodes, running raft. If you ran this inside `screen`, you can detach with `Ctrl + a + d`.

### Joining later

Now we will join node3. On node3 run:
```
$ node index.js 
Trying to get public ip address, please wait a few seconds...
Welcome! 

Please enter the IP address other nodes will use to connect to this node. 

Also, please enter a publicly identifyable string for this node to use.


prompt: localIpAddress:  (192.168.0.102) 
prompt: nodeName:  node3
Please select an option:
1) Raft
2) QuorumChain
5) Kill all geth and constellation
prompt: option:  1
```
Next, we pick option 3:
```
Please select an option below:
1) Start a new network as the coordinator [WARNING: this clears everything]
2) Start a new network as a non-coordinator [WARNING: this clears everything]
3) Join already running raft network [WARNING: this clears everything]
4) TODO: Start whisper services and attach to already running node
5) killall geth constellation-node
0) Quit
prompt: option:  3
```
Enter the ip address of the coordinating node:
```
In order to join the network, please enter the ip address of the coordinating node
prompt: ipAddress:  192.168.0.100
[*] Joining communication network...
true
[*] Communication network started
[*] Starting new network...
Generating node key

enode: enode://14dff901c29a4af1f6e19b966093f2dfd25a6c8bec0b18001d622487de1750c605831f05ee795af10e9d0a9f846fa9a3012fe642fbfdffe25f0cab2e9bf88cda@192.168.0.102:20000?raftport=40000

[*] Requesting existing network membership. This will block until the other node responds
[*] Network membership: ACCEPTED
[*] Requesting genesis block config. This will block until the other node is online
received genesis config
[*] Requesting static nodes file. This will block until the other node is online
received static nodes file
[*] New network started
Please select an option below:
1) Start a new network as the coordinator [WARNING: this clears everything]
2) Start a new network as a non-coordinator [WARNING: this clears everything]
3) Join already running raft network [WARNING: this clears everything]
4) TODO: Start whisper services and attach to already running node
5) killall geth constellation-node
0) Quit
prompt: option:
```

You should now have three connected nodes running raft.

## Network topology

<Section still to be completed>

## Account management

New accounts that are created via `geth` with automatically be seeded with some ether. This is acheived with a whisper message that requests ether from other nodes and as such can easily be extended to work for accounts that are not created via `geth`.

## Constellation - privacy/confidentiality

Nodes in the network will automatically generate constellation keys (future releases might broadcast the public key using whisper). This means that this network supports the privacy/confidentiality features of Quorum.

## Pausing block making

There is a script `pauseBlockMaking.js` that will pause the blockmaker if no transactions are present. Depending on the use/test case this can greatly aid in node syncing times. Unfortunately there is currently a bug with`--preload` so this script can't be loaded automatically. Here is a workaround:

To pause blockmaking on the network, the following only needs to be done on the node that is acting as the blockmaker:

1. The terminal session that runs the below steps needs to stay open. To help with this, start a new screen (`sudo apt-get install screen` and `screen -S pauseBlockMaker`). 
2. Run `./attachToLocalQuorumNode.sh` (after the node is started) to connect to the node.
3. Run `loadScript('pauseBlockMaking.js')`. This should print `-------------loaded pause Blockmaker script`.
4. Detach from the screen (`Ctrl + a + d`, while pressing `Ctrl` first press `a` and then press `d`)

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

# Constellation

The `removeConstellation.sh` script can be used to remove constellation binaries and their entry into the `.bashrc`. Note that this script will leave the constellation directories intact (this is to prevent accidental deletion of directories if constellation wasn't installed using the `setup.sh` script).

## Upgrading Constellation

The QuorumNetworkManager upgrades constellation from `v0.0.1` to `v0.1.0` in commit [9061d3c](https://github.com/ConsenSys/QuorumNetworkManager/commit/9061d3c4144c9c9f25c607ad2a1a116f4ea81526). If you are on constellation `v0.0.1` and want to upgrade to `v0.1.0` please:

1. use a version of the QNM after [9061d3c](https://github.com/ConsenSys/QuorumNetworkManager/commit/9061d3c4144c9c9f25c607ad2a1a116f4ea81526)
2. run the `upgradeConstellationTo010.sh` script
3. run `source ~/.bashrc`



