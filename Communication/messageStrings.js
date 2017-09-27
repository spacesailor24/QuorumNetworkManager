const delimiter = "|";

function buildString(type, parameter) {
	return type + delimiter + parameter;
}

function join(str1, str2) {
  return str1 + delimiter + str2;
}

function buildPostObject(topics, payload, ttl, workToProve, id) {
  postObj = { 
    JSON: {
      'topics': topics,
      'payload': payload,
      'ttl': ttl,
      'workToProve': workToProve
    },
    filterObject: buildFilterObject(topics)
  };
  if (id != undefined) {
    postObj.JSON.from = id
  }
  return postObj;
}

function buildFilterObject(topics) {
  return {'topics': topics};
}

request = {
  ether: buildString('request', 'ether'),
  enode: buildString('request', 'enode'),
  genesisBlock: buildString('request', 'genesisBlock'),
  staticNode: buildString('request', 'staticNode')
};

response = {
  ether: buildString('response', 'ether'),
  enode: buildString('response', 'enode'),
  genesisBlock: buildString('response', 'genesisBlock'),
  staticNode: buildString('response', 'staticNode')
};

exports.Join = join;
exports.BuildPostObject = buildPostObject;
exports.BuildFilterObject = buildFilterObject;
exports.Request = request;
exports.Response = response;
