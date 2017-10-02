#!/bin/bash

sudo apt-get update;
sudo apt-get install -y build-essential libssl-dev git curl
# zkp
sudo apt-get install -y build-essential unzip libdb-dev libsodium-dev zlib1g-dev libtinfo-dev solc sysvbanner wrk libboost-all-dev libssl-dev git libgmp3-dev libprocps4-dev libgtest-dev python-markdown

curl -sL https://deb.nodesource.com/setup_8.x | sudo -E bash -
sudo apt-get install -y nodejs

wget https://storage.googleapis.com/golang/go1.7.linux-amd64.tar.gz
sudo tar -xvf go1.7.linux-amd64.tar.gz
sudo cp -r go/ /usr/local/
sudo rm -rf go/ go1.7.linux-amd64.tar.gz

export GOROOT=/usr/local/go
export GOPATH=$HOME/projects/go
export PATH=$GOPATH/bin:$GOROOT/bin:$PATH

sudo apt-get install -y software-properties-common
sudo add-apt-repository -y ppa:ethereum/ethereum
sudo apt-get update
sudo apt-get install -y ethereum
sudo mv /usr/bin/geth /usr/bin/normalGeth

git clone https://github.com/jpmorganchase/quorum.git
cd quorum/
make all
echo "PATH=\$PATH:"$PWD/build/bin >> ~/.bashrc
source ~/.bashrc
export PATH=$PWD/build/bin:$PATH

cd ..
mkdir constellation && cd constellation/
sudo apt-get install -y libdb-dev libsodium-dev zlib1g-dev libtinfo-dev unzip
wget https://github.com/jpmorganchase/constellation/releases/download/v0.0.1-alpha/ubuntu1604.zip
unzip ubuntu1604.zip
chmod +x ubuntu1604/constellation-node
chmod +x ubuntu1604/constellation-enclave-keygen
echo "PATH=\$PATH:"$PWD/ubuntu1604 >> ~/.bashrc
source ~/.bashrc
export PATH=$PWD/ubuntu1604:$PATH

cd ..
git clone https://github.com/davebryson/quorum-genesis.git
cd quorum-genesis/
sudo npm install -g

cd ..
git clone https://github.com/consensys/QuorumNetworkManager.git
cd QuorumNetworkManager/
git checkout zkpPrecompiles
npm install
