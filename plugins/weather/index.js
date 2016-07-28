var request = require('request');

module.exports = {
   name: 'weather',
   plugin: getResponse
};
function getResponse(msg, args) {
  return new Promise((resolve, reject) => {
    request({
        url: 'http://api.openweathermap.org/data/2.5/find?q=' + encodeURIComponent(args[0].replace(/"/g, '')).replace(/%20/g, '+') + '&type=accurate&lang=en&mode=json&units=imperial&appid=a3b716995fdc14b0dab4e08f25dfbfe7',
        json: true
      },
      (error, response, body) => {
        if (error || response.statusCode !== 200 || !body.list) {
          return reject(':/');
        }
        try{
          var temp = body.list[0].main.temp.toFixed(1).replace(/(\.\d*?)0+$/, "$1").replace(/\.$/, "");
          var msg = "Currently in "+ body.list[0].name + " is " + temp + " degrees, "+ body.list[0].weather[0].description;
        }catch(e){
          reject(e);
        }
        resolve({
          response: msg,
          type: 'voice'
        });
      });
  });
}
