#!/bin/bash

# check current location
if [ $# == 0 ]
then
  echo "Please provide the block number as first parameter"
else
  if [ "${PWD##*/}" == 'QuorumNetworkManager' ]
  then
    echo "Setting byzantiumBlock to $1"
    # gracefully shut the client down
    ./shutdown.sh
    pm2 stop setupFromConfig

    # create a backup of the keystore and nodekey
    mkdir -p ../backup
    cp -r Blockchain/keystore ../backup/.
    cp Blockchain/geth/nodekey ../backup/.

    # delete pending transactions
    rm Blockchain/geth/transactions.rlp

    # add the byzantiumBlock to the genesis config
    node addByzantiumBlockToGenesis.js $1

    # restart the client
    if [ $# == 2 ]
    then
      KEEP_FILES=true TARGET_GAS_LIMIT=$2 pm2 --update-env start setupFromConfig
    else
      KEEP_FILES=true pm2 --update-env start setupFromConfig
    fi
  else
    echo "Not in QuorumNetworkManager directory!"
  fi
fi
