const Discord = require('discord.io');
const logger = require('winston');
const https = require('https');
const pg = require('pg');

const auth = require('./auth.json');
// Configure logger settings
logger.remove(logger.transports.Console);
logger.add(logger.transports.Console, {
    colorize: true
});
logger.level = 'debug';

// Initialize Discord Bot
const clientId = process.env.IMGUR_CLIENT_ID || auth.IMGUR_CLIENT_ID;
let allowNSFW = false;
let cache = {};
let restrictList = [];

//got this function from Mozilla Dev Net.
function getRandomInt(min, max) {
  min = Math.ceil(min);
  max = Math.floor(max);
  return Math.floor(Math.random() * (max - min)) + min; //The maximum is exclusive and the minimum is inclusive
}

 function getRandImg(cacheObject, isNsfwChannel = false){
	if (cacheObject.filteredLinkCount === 0){
		return `Sorry, no valid images for this subreddit`;
	}

	const index = getRandomInt(0, cacheObject.links.length);
	let currentLink = cacheObject.links.splice(index,1)[0];

	if (isNsfwChannel === true || currentLink.nsfw === false){
		return currentLink.url;
	} else {
		if (allowNSFW && currentLink.nsfw === true)
			return currentLink.url;
		else
			return `You cant handle this NSFW img, bro! Here is an unrendered link:\n${currentLink.url.substring(7, currentLink.url.length)}`;
	}
}

function makeCacheObject(json){
	let links = json.data.filter( (item) => item["size"] != 0 ).map((item) => {
                                                                return {url:item["gifv"] || item["link"], nsfw:item["nsfw"]} });
	return {
		links: links,
		filteredLinkCount: links.length
	}
}

var bot = new Discord.Client({
   token: auth.token,
   autorun: true
});



bot.on('ready', function (evt) {
    logger.info('Connected');
    logger.info('Logged in as: ');
    logger.info(bot.username + ' - (' + bot.id + ')');
	logger.info(process.env);

  //connect to database
	pg.connect(process.env.DATABASE_URL , function(err, client, done) {
		client.query('SELECT item FROM restrict_list', function(err, result) {
		  done();
		  if (err)
		   { console.error(err);}
		  else
		   {
			restrictList = result.rows.map( row => row.item );
			}
		});
	});

});

bot.on('message', function (user, userID, channelID, message, evt) {
    // Our bot needs to know if it will execute a command
    // It will listen for messages that will start with `!`
	logger.info(`User: ${user} on channel ${channelID} with message ${message}. NSFW Channel: ${message.channel.nsfw}`);

    if (message.substring(0, 1) == '!') {
        var args = message.substring(1).split(' '); //remove ! and split args
        var cmd = args[0];

        const param = args.splice(1, 1)[0]; //keep on splicing to get more args
        switch(cmd) {
            case 'ping':
                bot.sendMessage({
                    to: channelID,
                    message: 'Pong!'
                });
            break;
            case 'pong':
                bot.sendMessage({
                    to: channelID,
                    message: 'Ping!'
                });
            break;
      			case 'flush':
      				if (param){
      					delete cache[param];
      				} else {
      					cache = {};
      				}
                      bot.sendMessage({
                          to: channelID,
                          message: `*Cache flushed, these links be fresh now`
                      });
                  break;
      			case 'nsfw':
      				if (param){
      					if (param === "on"){
      						allowNSFW = true;
      					} else if (param === "off"){
      						allowNSFW = false;
      					} else if (param === "toggle"){
      						allowNSFW = !allowNSFW;
      					}
      				}
      				bot.sendMessage({
                          to: channelID,
                          message: `NSFW is currently set to ${(allowNSFW) ? "On, nsfw links will be shown" : "Off, nsfw links will be hidden"}.`
                      });
                  break;
                  case 'img':
      				let subreddit = param;
      				if (!subreddit){
      					bot.sendMessage({
      					to: channelID,
      					message: "**Must specify a subreddit!**\nEx:\n!img subreddit_name --> !img gifs"
      					});
      					return;
      				}

      				subreddit = subreddit.toLowerCase();

      				if (allowNSFW === false && restrictList.includes(subreddit) ){
      					bot.sendMessage({
      						to: channelID,
      						message: "*Please check yourself before you wreck yourself*"
      					});
      					return;
      				}

              //get from cache if available
      				if (cache[subreddit] && cache[subreddit].links.length > 0){
      					logger.info("Cache used");
      					bot.sendMessage({
      						to: channelID,
      						message: getRandImg(cache[subreddit], message.channel.nsfw )
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
      				  res.on('data', (d) => {body.push(d); })
      				  .on('end', () => {
        					body = Buffer.concat(body).toString();

        					//check for response body contents
        					let rawBodyInfo = JSON.parse(body);
        					let botMessage = "";
        					if (rawBodyInfo.data.length > 0){
        						cache[subreddit] = makeCacheObject(rawBodyInfo);
        						if (cache[subreddit].links.length < 50)
        							botMessage = `**Warning! Only ${cache[subreddit].links.length} image(s) associated with the __${subreddit}__ SubReddit imgur**\n`
        						botMessage += getRandImg(cache[subreddit],  message.channel.nsfw);
        					} else {
        						botMessage = `Error: no images for subreddit '${subreddit}' found`;
        					}

        					bot.sendMessage({
        						to: channelID,
        						message: botMessage
        					});

					      }); //end http msg received
      				}).on('error', (e) => {
      				  console.error(e);
      				}); //end http request
            break;
         } //end switch
     }
});
