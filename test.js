var request = require('request');

var text = 'Oi gatos';

var cookieJar = request.jar(),
  assetsLocation = __dirname + '/assets',
  headers = {
    'Cache-control': 'no-cache',
    'Accept-language': 'en-US,en;q=0.8,pt;q=0.6',
    'User-agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_10_5) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/48.0.2564.116 Safari/537.36',
    'Accept': '*/*',
    'Origin': 'https://www.ivona.com'
  };
new Promise((resolve, reject) => {
  request({
    url: headers.Origin,
    jar: cookieJar,
    headers: headers
  }, (error, response, body) => {
    if (error) return reject(error);
    resolve(body.match(/name='csrfield' type='hidden' value=.([^\x22\x27]+)/)[1]);
  });
}).then((csrf) => {
  headers['Content-Type'] = 'application/x-www-form-urlencoded; charset=UTF-8';
  headers['X-Requested-With'] = 'XMLHttpRequest';
  var options = {
    url: headers.Origin + '/let-it-speak/?setLang=us',
    body: `csrfield=${csrf}&ext=mp3&ref-form-name=VoiceTesterForm&send=Play&text=${text}&voiceSelector=34`,
    jar: cookieJar,
    headers: headers
  };
  return new Promise((resolve, reject) => {
    request.post(options, (error, response, body) => {
      if (error) return reject(error);
      var audioUrl = body.match(/audioUpdate\(.([^\x22\x27]+)/);
      if (audioUrl && audioUrl.length) {
        resolve(audioUrl[1]);
      } else {
        reject('error');
      }
    });
  });
}).then((url) => {

  var spawn = require('child_process').spawn;

  var args = [
    '-seekable', '0',
    '-i', url,
    '-f' ,'ogg',
    '-acodec', 'libvorbis',
    'pipe:1'
  ];

  var stderr = '',stdout = '';
  var ffmpeg = spawn('ffmpeg', args);

  ffmpeg.stderr.on('data', function(err) {
    stderr += err;
  });

  ffmpeg.stdout.on('data', function(data) {
    stdout += data;
  });

  ffmpeg.on('exit', function(code) {
    console.log(stderr, stdout, code);
  });


});
