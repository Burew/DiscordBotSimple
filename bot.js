var Discord = require('discord.io');
var logger = require('winston');
const https = require('https');

var auth = require('./auth.json');
// Configure logger settings
logger.remove(logger.transports.Console);
logger.add(logger.transports.Console, {
    colorize: true
});
logger.level = 'debug';
// Initialize Discord Bot

function getRandomInt(min, max) {
  min = Math.ceil(min);
  max = Math.floor(max);
  return Math.floor(Math.random() * (max - min)) + min; //The maximum is exclusive and the minimum is inclusive
}

 function getRandImg(cacheObject){ 
	const index = getRandomInt(0, cacheObject.links.length);
	console.log(`current length: ${cacheObject.links.length}, current index: ${index}`);
	return cacheObject.links.splice(index,1)[0];
	 
}

function makeCacheObject(json){
	return {
		links: json.data.map(item => item["link"]),
		count: 0
	}
}

const clientId = "d839b8dd67f5cb7";
let cache = {};

var bot = new Discord.Client({
   token: auth.token,
   autorun: true
});

bot.on('ready', function (evt) {
    logger.info('Connected');
    logger.info('Logged in as: ');
    logger.info(bot.username + ' - (' + bot.id + ')');
});

bot.on('message', function (user, userID, channelID, message, evt) {
    // Our bot needs to know if it will execute a command
    // It will listen for messages that will start with `!`
	logger.info(`User: ${user} on channel ${channelID} with message ${message}`);
	
    if (message.substring(0, 1) == '!') {
        var args = message.substring(1).split(' '); //remove ! and split args
        var cmd = args[0];
		
        const param = args.splice(1, 1)[0]; //keep on splicing to get more args
        switch(cmd) {	
            // !ping
            case 'ping':
                bot.sendMessage({
                    to: channelID,
                    message: 'Pong!'
                });
            break;
            case 'img':
				let subreddit = param;
				if (!subreddit){
					bot.sendMessage({
					to: channelID,
					message: "Must specify a subreddit!\nEx:\n!img subreddit_name --> !img gifs"
					});
					return;
				}
				
				subreddit = subreddit.toLowerCase(); //make it consistent
				
				if (cache[subreddit] && cache[subreddit].links.length > 30){ 
					logger.info("Cache used");
					bot.sendMessage({
						to: channelID,
						message: getRandImg(cache[subreddit])
					});
					return;
				}
				
				const options = {
					hostname: 'api.imgur.com',
					path: `/3/gallery/r/${subreddit}`,
					headers: {'Authorization': `Client-ID ${clientId}`}
				};
				let body = [];
				
				https.get(options, (res) => {
				  //console.log('statusCode:', res.statusCode);
				  //console.log('headers:', res.headers);
				  res.on('data', (d) => {body.push(d); })
				  .on('end', () => {
					body = Buffer.concat(body).toString();
					
					cache[subreddit] = makeCacheObject(JSON.parse(body));
					let botMessage = getRandImg(cache[subreddit]);
										
					bot.sendMessage({
						to: channelID,
						message: botMessage
					});
					});
				 
				}).on('error', (e) => {
				  console.error(e);
				});
            break;
			default:
				bot.sendMessage({
					to: channelID,
					message: "Message not found"
				});
         }
     }
});

