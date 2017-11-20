#!/bin/bash
set -u
set -e

geth --datadir Blockchain init quorum-genesis.json &>> /dev/null

nohup constellation-node constellation.config &> constellation.log &

sleep 5

FLAGS="--datadir Blockchain --shh --port $2 --unlock 0 --password passwords.txt --raft"

RPC_API="admin,db,eth,debug,miner,net,shh,txpool,personal,web3,quorum,raft"
HTTP_RPC_ARGS="--rpc --rpcaddr 0.0.0.0 --rpcport $1 --rpcapi $RPC_API"
WS_RPC_ARGS="--ws --wsaddr 0.0.0.0 --wsport $3 --wsapi $RPC_API --wsorigins=*"

RAFT_ARGS="--raftport $3"

if [ "$#" == 5 ]
  then
  RAFT_ARGS="$RAFT_ARGS --raftjoinexisting $5"
fi

ALL_ARGS="$FLAGS $HTTP_RPC_ARGS $WS_RPC_ARGS $RAFT_ARGS"

PRIVATE_CONFIG=constellation.config nohup geth $ALL_ARGS &> gethNode.log &

echo "[*] Node started"
