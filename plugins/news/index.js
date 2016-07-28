var request = require('request');

module.exports = {
   name: 'news',
   plugin: getResponse
};
function getResponse(msg, args) {
  return new Promise((resolve, reject) => {
    request({
        url: 'http://ajax.googleapis.com/ajax/services/feed/load?v=1.0&num=5&q=http%3A%2F%2Fnews.google.com.br%2Fnews%3Fcf%3Dall%26hl%3Den%26pz%3D1%26ned%3Den_us%26topic%3Dh%26output%3Drss&rdn='+new Date().valueOf(),
        json: true
      },
      (error, response, body) => {
        if (error || response.statusCode !== 200) {
          return reject(':/');
        }
        try{
          var msg = "";
          var count = 0;
          body.responseData.feed.entries.forEach(function(s) {
            count++;
            var noticia = s.title.match(/^([^-]+)-(.+)/);
            if(noticia.length){
              msg +=noticia[1] + " - <a href='"+s.link.match(/([^=]+)$/)[1]+"'>"+noticia[2]+"</a>\n\n";
            }else{
              msg += s.title + " - <a href='"+s.link.match(/([^=]+)$/)[1]+"'>Ler</a>\n\n";
            }
            if(count >= 5){
              resolve({
                response: msg,
                type: 'text'
              });
            }
          });
        }catch(e){
          reject(e);
        }

      });
  });
}
