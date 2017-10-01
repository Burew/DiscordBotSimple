const Discord = require("discord.js");
const rp = require("request-promise");
const YouTube = require("youtube-node");
const ytdl = require("ytdl-core");

const settings = require("./settings.json");

const bot = new Discord.Client();
const youTube = new YouTube();

youTube.setKey(settings.YOUTUBE_API_KEY);

// Initialize Discord Bot
const clientId = process.env.IMGUR_CLIENT_ID || settings.IMGUR_CLIENT_ID;
let allowNSFW = false;
let cache = {};

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

function imgurSubredditPromise(subreddit){
  var imgurSubredditPicOptions = {
      uri: `https://api.imgur.com/3/gallery/r/${subreddit}`,
      headers: {
          "Authorization": `Client-ID ${clientId}`
      },
      json: true // Automatically parses the JSON string in the response
  };
  return rp(imgurSubredditPicOptions);
}

bot.on("ready", () => {
  console.log("Bot is ready");
});

bot.on("message", function (message) {
  console.log(`### Channel "${message.channel.name}" is considered a NSFW channel: ${message.channel.nsfw} ###`);

  if (
    message.author.bot || //filter out bot responses
    !message.content.startsWith(settings.prefix) //filter out non-prefix messages
    )
    return;

    var args = message.content.substring(1).split(" "); //remove ! and split args
    var cmd = args.splice(0,1).toString().toLowerCase();

    const param = args.splice(0, 1)[0]; //keep on splicing to get more args
    switch(cmd) {
        case "ping":
          message.channel.send(`:ping_pong:\n*${Date.now() - message.createdTimestamp} ms*`);
        break;
  			case "flush":
  				if (param){
  					delete cache[param];
  				} else {
  					cache = {};
  				}
          message.channel.send(`Cache Flushed, these links be fresh now`);
        break;
  			case "nsfw":
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
        case "img":
  				let subreddit = param.toLowerCase();
  				if (!subreddit){
            message.channel.send("**Must specify a subreddit!**\nEx:\n!img subreddit_name --> !img gifs");
  					return;
  				}

          //get from cache if available
  				if (cache[subreddit] && cache[subreddit].links.length > 0){
            message.channel.send(getRandImg(cache[subreddit], message.channel.nsfw));
            return;
  				}

          //make new request to imgur
          imgurSubredditPromise(subreddit)
      		    .then(function (JSONdata) {
      					let botMessage = "";
      					if (JSONdata.data.length !== 0){
      						cache[subreddit] = makeCacheObject(JSONdata);
      						if (cache[subreddit].links.length < 50)
      							botMessage = `**Warning! Only ${cache[subreddit].links.length} image(s) associated with the __${subreddit}__ SubReddit imgur**\n`
      						botMessage += getRandImg(cache[subreddit], message.channel.nsfw || message.channel.name.toLowerCase().includes("nsfw"));
      					} else {
      						botMessage = `Error: no images for subreddit "${subreddit}" found`;
      					}

                message.channel.send(botMessage);
      		    })
      		    .catch(function (err) {
      		        console.log(err);
              });
        break;
        case "imgbulk":
          let amount = parseInt(param);
          if (!isNaN(amount)){
            message.channel.send("Under construction, please wait while Ken works on this eventually");
          }
        break;
        case "yt":
          const voiceChannel = message.member.voiceChannel;
      		if (!voiceChannel){
      			return message.reply(`Please join a voice channel first!`); //mentions the user
      		}
          console.log("youTube search: " + param + " " + args.join(" "));

          voiceChannel.join()
            .then(voiceConnnection => {
              if (voiceConnnection.speaking){
                return message.channel.send("You must suffer until this song ends")
                  .then(msg => msg.delete(5000));
              }
              youTube.search(param + " " + args.join(" "), 1, function(error, result) {
                if (error) {
                  console.log(error);
                }
                else {
                  const link = result.items.map( item => item.id.videoId); //filterYoutubeVideoLinks(result);
                  const stream = ytdl(`https://www.youtube.com/watch?v=${link}`, { filter: "audioonly" });
                  const dispatcher = voiceConnnection.playStream(stream);
                  dispatcher.on("end", () => voiceChannel.leave());
                }
              }); //end youtube search and play
            }); //end voice channel joining
        break;
     } //end switch command parsing
}); //end bot.onMessage


bot.login(settings.token);
