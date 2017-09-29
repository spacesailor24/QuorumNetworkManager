const delimiter = "|";

function buildDelimitedString(string1, string2) {
  if (string2.indexOf(delimiter) > -1) {
    console.log("ERROR: Message string contains " + delimiter + ", which is reserved for special use");
  }
  return string1 + delimiter + string2;
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
  ether: buildDelimitedString('request', 'ether'),
  enode: buildDelimitedString('request', 'enode'),
  genesisConfig: buildDelimitedString('request', 'genesisConfig'),
  staticNodes: buildDelimitedString('request', 'staticNodes')
};

response = {
  ether: buildDelimitedString('response', 'ether'),
  enode: buildDelimitedString('response', 'enode'),
  genesisConfig: buildDelimitedString('response', 'genesisConfig'),
  staticNodes: buildDelimitedString('response', 'staticNodes')
};

exports.BuildDelimitedString = buildDelimitedString;
exports.BuildPostObject = buildPostObject;
exports.BuildFilterObject = buildFilterObject;
exports.Request = request;
exports.Response = response;
