#!/bin/bash
set -u
set -e

geth --datadir Blockchain init quorum-genesis.json &>> /dev/null

nohup constellation-node constellation.config &> constellation.log &

sleep 5

FLAGS="--datadir Blockchain --shh --port $2 --unlock 0 --password passwords.txt --raft"
RPC_API="admin,db,eth,debug,miner,net,shh,txpool,personal,web3,quorum,raft,zsl"
RPC_FLAGS="--rpc --rpcaddr 0.0.0.0 --rpcapi $RPC_API --rpcport $1"

RAFT_ARGS="--raftport $3"

if [ "$#" == 4 ]
  then
  RAFT_ARGS="$RAFT_ARGS --raftjoinexisting $4"
fi

ALL_ARGS="$FLAGS $RPC_FLAGS"

PRIVATE_CONFIG=constellation.config nohup geth $ALL_ARGS &> gethNode.log &

echo "[*] Node started"
