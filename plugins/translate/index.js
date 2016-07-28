var translate = require('yandex-translate')('APIKEY');


module.exports = {
   name: 'translate',
   plugin: getResponse
};
function getResponse(msg, args) {
  return new Promise((resolve, reject) => {
    translate.translate(args[0].replace(/"/g, ''), { to: args[1] }, function(err, res) {
      if (err || res.code != 200) {
        return reject(':/');
      }
      resolve({
        response: res.text,
        type: 'voice',
        extras: args[2]
      });
    });
  });
}
