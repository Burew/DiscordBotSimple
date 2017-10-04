const rp = require("request-promise");

//got this function from Mozilla Dev Net.
function getRandomInt(min, max) {
  min = Math.ceil(min);
  max = Math.floor(max);
  return Math.floor(Math.random() * (max - min)) + min; //The maximum is exclusive and the minimum is inclusive
}

function getRandImg(cacheObject, allowNSFW = false, isNsfwChannel = false){
  if (cacheObject.filteredLinkCount === 0){
		return `Sorry, no valid images for this subreddit`;
	}

	const index = getRandomInt(0, cacheObject.links.length);
	const currentLink = cacheObject.links.splice(index,1)[0];

  if (isNsfwChannel || allowNSFW || currentLink.nsfw === false){
    return currentLink.url;
  }
  return `This image is NSFW! Here is an unrendered link:\n${currentLink.url.substring(8)}`;

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

function imgurSubredditPromise(subreddit, client){
  var imgurSubredditPicOptions = {
      uri: `https://api.imgur.com/3/gallery/r/${subreddit}`,
      headers: {
          "Authorization": `Client-ID ${client.customSettings.IMGUR_CLIENT_ID}`
      },
      json: true // Automatically parses the JSON string in the response
  };
  return rp(imgurSubredditPicOptions);
}

module.exports.run = (client, message, args) => {
  let subreddit = args.join(" ").toLowerCase();
  if (!subreddit){
    message.channel.send("**Must specify a subreddit!**\nEx:\n!img subreddit_name --> !img gifs");
    return;
  }

  //get from cache if available
  if (client.customData.cache[subreddit] && client.customData.cache[subreddit].links.length > 0){
    return message.channel.send(
      getRandImg(client.customData.cache[subreddit], client.customSettings.allowNSFW, message.channel.nsfw || message.channel.name.toLowerCase().includes("nsfw"))
    );

  }

  //make new request to imgur
  imgurSubredditPromise(subreddit, client)
      .then(function (JSONdata) {
        let clientMessage = "";
        if (JSONdata.data.length !== 0){
          client.customData.cache[subreddit] = makeCacheObject(JSONdata);
          if (client.customData.cache[subreddit].links.length < 50)
            clientMessage = `**Warning! Only ${client.customData.cache[subreddit].links.length} image(s) associated with the __${subreddit}__ SubReddit imgur**\n`
          clientMessage += getRandImg(client.customData.cache[subreddit], client.customSettings.allowNSFW, message.channel.nsfw || message.channel.name.toLowerCase().includes("nsfw"));
        } else {
          clientMessage = `Error: no images for subreddit "${subreddit}" found`;
        }
        message.channel.send(clientMessage);
      })
      .catch(function (err) {
          console.log(err);
      });
};
