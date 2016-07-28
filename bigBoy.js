var fs = require('fs'),
    request = require('request'),
    s2t = require('./core/speech2text.js'),
    ffmpeg = require('ffmpeg-node'),
    RiveScript = require('rivescript'),
    TelegramBot = require('node-telegram-bot-api'),
    spawn = require('child_process').spawn;

var BigBoy = function(config) {

    this.config = config || {};
    this.telegram = new TelegramBot(this.config.token, {
        webHook: {
            port: process.env.PORT || this.config.port
        }
    });
    this.rivescript = new RiveScript({
        utf8: true
    });
    this.rivescript.unicodePunctuation = new RegExp(/[?!";:@#$%^&*()]/g);
    this.telegram.setWebHook(`${this.config.webhook}bot${this.config.token}`);
    this.middlewares = [];

    this.telegram.on('text', this._onText.bind(this));
    this.telegram.on('voice', this._onVoice.bind(this));

    this.plugins = {};

    this.rivescriptBrains = [
        './core/brain.rive'
    ];

    fs.readdir('plugins', (err, files) => {
        if (err || !files.length) return;
        this._loadPlugins(files);
    });
};

BigBoy.prototype._loadPlugins = function(files) {
    this.config.plugins = this.config.plugins || {};
    var self = this;

    files.forEach((file, index) => {
        var plugin = './plugins/' + file;
        if (!fs.statSync(plugin).isDirectory() || this.config.plugins[file] === false) {
            return;
        }
        this.config.plugins[file] = true;
        var tempPlugin = require(plugin);
        if (!tempPlugin.name || !tempPlugin.plugin) return;
        this._registerPlugin(file, tempPlugin.name, tempPlugin.plugin).then(() => {
            //fix this
            if (index === files.length - 1) {
                self._loadRivescripts();
            }
        });
    });
};

BigBoy.prototype.use = function(middlewares) {
    this.middlewares = middlewares;
};

BigBoy.prototype._exeMiddlewares = function(msg) {
    return this.middlewares.reduce(function(cur, next) {
        return cur.then((val) => {
            try {
                return require('./middlewares/' + next)(val);
            } catch (e) {
                console.warn('Middleware not found: ', next);
            }
        }).catch((err) => console.warn(next, err));
    }, Promise.resolve(msg));
};

BigBoy.prototype._onText = function(msg) {
    this._exeMiddlewares(msg).then((res) => {
         console.log('msg: ', res.text);
        var reply = this.rivescript.reply(res.from.username, res.text, this);
        console.log('reply: ', reply);
        if (/^\//.test(reply)) {
            this.runPlugin(res, reply);
        } else if (reply != 'ERR: No Reply Matched') {
            this.telegram.sendMessage(res.chat.id, reply, {
                parse_mode: 'HTML'
            });
        }
    });
};


BigBoy.prototype._onVoice = function(msg) {
    if (msg.voice.duration > 15) return;
    var self = this;
    this.telegram.getFileLink(msg.voice.file_id).then((link) => {
        var stdout = [];
        var ffmpeg = spawn('ffmpeg', [
          '-i', link,
          '-f', 'flac',
          '-ar', '16000', '-'
        ]);
        ffmpeg.stdout.on('data', function(data) {
          stdout.push(data);
        });

        ffmpeg.on('exit', function(code) {
          var newBuffer = Buffer.concat(stdout);
          var speech = s2t.transcript(newBuffer, {
              type: 'audio/x-flac',
              rate: 16000,
              api_key: 'GOOGLE API KEY',
              language: 'en'
          }).then((translation) => {
            console.log('stt:', translation);
            msg.text = translation;
            self._onText(msg);
          }).catch((error) => {
            console.warn('stt:',error);
          });
        });

    });
};

BigBoy.prototype._registerPlugin = function(plugin, name, cb) {
    return new Promise((resolve, reject) => {
        fs.access('./plugins/' + plugin + '/brain.rive', fs.R_OK | fs.W_OK, (err) => {
            if (!err) {
                this.addBrain(`./plugins/${plugin}/brain.rive`);
                resolve();
            }
        });
        this.plugins[name] = cb;
    });
};

BigBoy.prototype.runPlugin = function(msg, reply) {
    var cmd = reply.match(/^\/([^\s]+)/)[1];
    var args = reply.replace(/^\/([^\s]+)(\s)?/, '');
    if (!this.plugins[cmd]) return;
    console.log(args.match(/("[^"]+"|[^\s"]+)/g));
    Promise.resolve(this.plugins[cmd](msg, args.match(/("[^"]+"|[^\s"]+)/g))).then((res) => {
        if (/^(tell me|talk)/.test(msg.text.toLowerCase())) {
            res.type = 'voice';
        }
        switch (res.type) {
            case 'voice':
                this.sendVoice(msg.chat.id, res.response, res.extras || 48);
                break;
            default:
                this.telegram.sendMessage(msg.chat.id, res.response, {
                    parse_mode: 'HTML',
                    disable_web_page_preview: true
                });
        }
    }).catch((err) => console.warn(err));

};

BigBoy.prototype.addBrain = function(brain) {
    console.info('Adding brain: ', brain);
    this.rivescriptBrains.push(brain);
};

BigBoy.prototype._loadRivescripts = function() {
    fs.writeFile('./app.json', JSON.stringify(this.config, null, '\t'), 'utf8');
    console.info('LoadFiles');
    this.rivescript.loadFile(
        this.rivescriptBrains,
        this._loadingDone.bind(this),
        this._loadingError.bind(this)
    );
};

BigBoy.prototype._loadingDone = function(batch_num) {
    console.info('Brains loaded!');
    this.rivescript.sortReplies();
};

BigBoy.prototype._loadingError = function(batch_num, error) {
    console.log('Error when loading files: ' + error);
};

BigBoy.prototype.getVoice = function(text, cb, voiceID) {
    if (typeof voiceID == 'undefined' || !voiceID) {
        voiceID = 48;
    }
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
            body: `csrfield=${csrf}&ext=ogg&ref-form-name=VoiceTesterForm&send=Play&text=${text}&voiceSelector=${voiceID}`,
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
        var stdout = [];
        var ffmpeg = spawn('ffmpeg', [
            '-seekable', '0',
            '-i', url,
            '-f', 'ogg',
            'pipe:1'
        ]);
        ffmpeg.stdout.on('data', function(data) {
            stdout.push(data);
        });
        ffmpeg.on('exit', function(code) {
            var newBuffer = Buffer.concat(stdout);
            cb(newBuffer);
        });
    });
};

BigBoy.prototype.sendVoice = function(messageID, text, voiceID) {
    this.getVoice(text, (audioFile) => {
        this.telegram.sendVoice(messageID, audioFile);
    }, voiceID);
};


module.exports = BigBoy;
