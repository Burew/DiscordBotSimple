const ytdl = require("ytdl-core");

module.exports.run = (client, message, args) => {
  let param = args.shift();

  const voiceChannel = message.member.voiceChannel;
  if (!voiceChannel){
    return message.reply(`Please join a voice channel before making requests!`); //mentions the user
  }

  voiceChannel.join()
    .then(voiceConnnection => {
      if (param === "stop"){
        return voiceChannel.leave();
      }

      //respond to song request
      if (voiceConnnection.speaking){
        return message.channel.send("Cannot take requests while a song is playing")
          .then(msg => msg.delete(10000));
      }

      let searchTerm = param + " " + args.join(" ");
      console.log(`Search term: ${searchTerm.replace( /[^A-Za-z0-9_ ]/g, "")}`);

      client.customData.youTube.search(searchTerm.replace( /[^A-Za-z0-9_ ]/g, "") , 1, function(error, result) {
        if (error) {
          console.log(error);
        }
        else {
          if (result.items.length === 0){
            return message.channel.send(`No YouTube results found for search terms *${searchTerm}*`);
          }
          const link = result.items.map( item => item.id.videoId); //filterYoutubeVideoLinks(result);
          const stream = ytdl(`https://www.youtube.com/watch?v=${link}`, { filter: "audioonly" });
          const dispatcher = voiceConnnection.playStream(stream, {"bitrate":"auto", "volume":0.25});
          dispatcher.on("error", (err) => {console.log(err)});

          console.log(`Now playing ${result.items[0].snippet.title}`);
          message.channel.send(`Now playing ${result.items[0].snippet.title}`)
            .then(msg => msg.delete(10000));
          dispatcher.on("end", () => voiceChannel.leave());
        }
      }); //end youtube search and play
    })
    .catch(console.error);
};
