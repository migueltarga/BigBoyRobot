const BigBoy = require('./bigBoy.js'),
			config = require('./app.json');

var bot = new BigBoy(config);
bot.use(['languagedetector','formatmessage']);
