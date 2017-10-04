module.exports.run = (client, message, args) => {
  message.channel.send(`:ping_pong:\n*${Date.now() - message.createdTimestamp} ms*`);
};
