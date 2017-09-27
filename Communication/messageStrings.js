const delimiter = "|";

function buildString(type, parameter) {
	return type + delimiter + parameter;
}

module.exports = {
  join: function(str1, str2) {
    return str1 + delimiter + str2;
  },
  request: {
    ether: buildString('request', 'ether'),
    enode: buildString('request', 'enode'),
    genesisBlock: buildString('request', 'genesisBlock'),
    staticNode: buildString('request', 'staticNode')
  },
  response: {
    ether: buildString('response', 'ether'),
    enode: buildString('response', 'enode'),
    genesisBlock: buildString('response', 'genesisBlock'),
    staticNode: buildString('response', 'staticNode')
  }
};
