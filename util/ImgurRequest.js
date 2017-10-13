const rp = require("request-promise");

//got this function from Mozilla Dev Net.
function getRandomInt(min, max) {
  min = Math.ceil(min);
  max = Math.floor(max);
  return Math.floor(Math.random() * (max - min)) + min; //The maximum is exclusive and the minimum is inclusive
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

function getImgsFromCache(cacheObject, allowNSFW = false, amount = 1){
  if (cacheObject.filteredLinkCount === 0){
		return `Sorry, no valid images for this subreddit`;
	}

  let bulkAmount = Math.min(amount, cacheObject.links.length);
  let startIndex = getRandomInt(0, cacheObject.links.length);

  if (bulkAmount !== 1)
    startIndex = 0;

  const links = cacheObject.links.splice(startIndex, bulkAmount).map(currentLink => {
    if (allowNSFW || currentLink.nsfw === false){
      return currentLink.url;
    }
    return `**NSFW Image!** Here is an unrendered link:\n${currentLink.url.substring(8)}`;
  });
  return links.join("\n");
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

async function populateImagesFromSubReddit(subreddit, client) {
  const JSONdata = await imgurSubredditPromise(subreddit, client);
  if (JSONdata.data.length !== 0){
    client.customData.cache[subreddit] = makeCacheObject(JSONdata);
  }
}


module.exports.getImage = async (client, message, subreddit, amount = 1) => {

  // get from cache if possible
  if (client.customData.cache[subreddit] && client.customData.cache[subreddit].links.length > 0){
    return message.channel.send(
      getImgsFromCache(client.customData.cache[subreddit], client.customSettings.allowNSFW || message.channel.nsfw || message.channel.name.toLowerCase().includes("nsfw"), amount)
    );
  }

  // else populate cache and then return image
  await populateImagesFromSubReddit(subreddit, client);

  let clientMessage = "";
  if (!client.customData.cache[subreddit])
    return message.channel.send(`Error: no images for subreddit "${subreddit}" found`);
  if (client.customData.cache[subreddit].filteredLinkCount < 50)
    clientMessage += `**Warning! Only ${client.customData.cache[subreddit].filteredLinkCount} image(s) associated with the __${subreddit}__ SubReddit imgur**\n`;
  return message.channel.send(
    clientMessage + getImgsFromCache(
                      client.customData.cache[subreddit],
                      client.customSettings.allowNSFW || message.channel.nsfw || message.channel.name.toLowerCase().includes("nsfw"),
                      amount)
  );


};
