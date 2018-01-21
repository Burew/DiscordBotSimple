const ImgurRequest = require("../util/ImgurRequest");

module.exports.run = (client, message, args) => {
  let subreddit = args.join("").toLowerCase();
  if (!subreddit){
    message.channel.send("**Must specify a subreddit!**\nEx:\n!img subreddit_name --> !img gifs");
    return;
  }
 return ImgurRequest.getImage(client, message, subreddit);
};
