#!/bin/bash
set -u
set -e

geth --datadir Blockchain init quorum-genesis.json &>> /dev/null

nohup constellation-node constellation.config &> constellation.log &

sleep 5

FLAGS="--datadir Blockchain --shh --port $1 --unlock 0 --password passwords.txt --raft"

RPC_API="admin,db,eth,debug,miner,net,shh,txpool,personal,web3,quorum,raft"
HTTP_RPC_ARGS="--rpc --rpcaddr 0.0.0.0 --rpcport $2 --rpcapi $RPC_API"
WS_RPC_ARGS="--ws --wsaddr 0.0.0.0 --wsport $3 --wsapi $RPC_API --wsorigins=*"

RAFT_ARGS="--raftport $4"

if [ "$5" == "permissionedNodes" ]
  then
  RAFT_ARGS="$RAFT_ARGS --permissioned Blockchain"
fi
if [ "$#" == 6 ]
  then
  RAFT_ARGS="$RAFT_ARGS --raftjoinexisting $6"
fi

ALL_ARGS="$FLAGS $HTTP_RPC_ARGS $WS_RPC_ARGS $RAFT_ARGS"

PRIVATE_CONFIG=constellation.config nohup geth $ALL_ARGS &> gethNode.log &

echo "[*] Node started"
