var request = require('request');

exports.transcript = function(audio, options) {

  const baseurl = 'https://www.google.com/speech-api/full-duplex/v1';
  var pair = parseInt(Math.random() * Math.pow(2, 32)).toString(16),
      download = `${baseurl}/down?pair=${pair}&key=${options.api_key}`,
      upload = `${baseurl}/up?key=${options.api_key}&pair=${pair}&lang=${options.language}&client=chromium&interim&continuous&pfilter=0&output=json`;

  return new Promise((resolve, reject) => {
    request.post(upload, {
      body: audio,
      timeout: 10000,
      headers: {
        'Content-Type': `${options.type}; rate=${options.rate}`,
        'Transfer-Encoding': 'chunked'
      }
    }, () => {});

    request(download, {
      timeout: 10000
    }, (err, response, body) => {
      if(err || response.statusCode !== 200) reject(err);
      var results = body.split('\n'),
          last_result = JSON.parse(results[results.length - 2]);
          if(!last_result.result[0]){
            reject(':(');
          }
      resolve(last_result.result[0].alternative[0].transcript);
    });
  });
};
