const Discord = require('discord.js');
var rp = require('request-promise');
const pg = require('pg');

const auth = require('./auth.json');

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
			return `This image is NSFW! Here is an unrendered link:\n${currentLink.url.substring(7, currentLink.url.length)}`;
	}
}

function makeCacheObject(json){
	let links = json.data
                    .filter( (item) => item["size"] != 0 ) //remove dead links
                    .map((item) => {return {url:item["gifv"] || item["link"], nsfw:item["nsfw"]} }); //extract urls from json
	return {
		links: links,
		filteredLinkCount: links.length
	}
}

var bot = new Discord.Client();

bot.on('ready', () => {
  //connect to database
	pg.connect(process.env.DATABASE_URL , function(err, client, done) {
		client.query('SELECT item FROM restrict_list', function(err, result) {
		  done();
		  if (err){
        console.error(err);}
		  else {
        restrictList = result.rows.map( row => row.item ) || [];
			}
		});
	});

  console.log('Bot is ready');
});

bot.on('message', function (message) {
  console.log(`### Channel '${message.channel.name}' is considered a NSFW channel: ${message.channel.nsfw} ###`);

  const prefix = '!';

  if (
    message.author.bot || //filter out bot responses
    !message.content.startsWith(prefix) //filter out non-prefix messages
    )
    return;

    var args = message.content.substring(1).split(' '); //remove ! and split args
    var cmd = args[0].toLowerCase();

    const param = args.splice(1, 1)[0]; //keep on splicing to get more args
    switch(cmd) {
        case 'ping':
          message.channel.send(`:ping_pong:\n*${Date.now() - message.createdTimestamp} ms*`);
        break;
  			case 'flush':
  				if (param){
  					delete cache[param];
  				} else {
  					cache = {};
  				}
          message.channel.send(`Cache Flushed, these links be fresh now`);
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
          message.channel.send(`NSFW is currently set to ${(allowNSFW) ? "On, nsfw links will be shown" : "Off, nsfw links will be hidden"}.`);
        break;
        case 'img':
  				let subreddit = param.toLowerCase();
  				if (!subreddit){
            message.channel.send("**Must specify a subreddit!**\nEx:\n!img subreddit_name --> !img gifs");
  					return;
  				}

  				if (allowNSFW === false && restrictList.includes(subreddit) ){
            message.channel.send("*Please check yourself before you wreck yourself*");
  					return;
  				}

          //get from cache if available
  				if (cache[subreddit] && cache[subreddit].links.length > 0){
            message.channel.send(getRandImg(cache[subreddit], message.channel.nsfw));
            return;
  				}

          //make new request to imgur
          var imgurSubredditPicOptions = {
      		    uri: `https://api.imgur.com/3/gallery/r/${subreddit}`,
      		    headers: {
      		        'Authorization': `Client-ID ${clientId}`
      		    },
      		    json: true // Automatically parses the JSON string in the response
      		};

          rp(imgurSubredditPicOptions)
      		    .then(function (JSONdata) {
      					let botMessage = "";
      					if (JSONdata.data.length !== 0){
      						cache[subreddit] = makeCacheObject(JSONdata);
      						if (cache[subreddit].links.length < 50)
      							botMessage = `**Warning! Only ${cache[subreddit].links.length} image(s) associated with the __${subreddit}__ SubReddit imgur**\n`
      						botMessage += getRandImg(cache[subreddit], message.channel.nsfw || message.channel.name.toLowerCase().includes('nsfw'));
      					} else {
      						botMessage = `Error: no images for subreddit '${subreddit}' found`;
      					}

                message.channel.send(botMessage);
      		    })
      		    .catch(function (err) {
      		        console.log(err);
              });
        break;
        case 'imgbulk':
          let amount = parseInt(param);
          if (!isNaN(amount)){
            //process request
          }
        break;
     } //end switch command parsing
}); //end bot.onMessage


bot.login(auth.token);
