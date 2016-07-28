
var getReturn = (msg, args) => {
  return {
    response: args[1],
    type: "voice",
    extras: args[0]
  }
}

module.exports = {
   name: 'voz',
   plugin: getReturn
};
