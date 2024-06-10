const express = require("express");
const chatRoute = express();
const chatController = require("../../controller/chat/ChatController.js");

//Chats
chatRoute.post("/", chatController.createChat);
chatRoute.get("/:userId", chatController.userChat);
chatRoute.get("/find/:firstId/:secondId", chatController.findChat);

//getrecepinet data
chatRoute.get("/getrecepientdata/:recId", chatController.recipientData);

//Message
chatRoute.post("/message", chatController.sendMessage);
chatRoute.get(
  "/message/:chatId",

  chatController.getMessage
);

//provider
chatRoute.get("/chat/:userId", chatController.getProviderChats);

module.exports = chatRoute;
