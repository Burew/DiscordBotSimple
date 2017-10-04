module.exports.run = (client, message, args) => {
  const param = args.shift();
  if (param){
    if (param === "on"){
      client.customSettings.allowNSFW = true;
    } else if (param === "off"){
      client.customSettings.allowNSFW = false;
    } else if (param === "toggle"){
      client.customSettings.allowNSFW = !client.customSettings.allowNSFW;
    }
  }
  message.channel.send(`${client.customSettings.allowNSFW ? "NSFW links will be shown" : "NSFW links will be hidden"}`)
    .then(msg => msg.delete(1000));
};
