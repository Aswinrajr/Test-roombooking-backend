const chatModel = require("../../model/chatModel");
const messageModel = require("../../model/messageModel");
const providerModel = require("../../model/providerModel");
const userModel = require("../../model/userModel");

const createChat = async (req, res) => {
  try {
    console.log("Welcome to create chat", req.body);

    const existRoom = await chatModel.findOne({
      bookingId: req.body.bookingId,
    });
    console.log("ExistRoom", existRoom);

    if (!existRoom) {
      const newChat = new chatModel({
        members: [req.body.userId, req.body.proId],
        bookingId: req.body.bookingId,
      });
      const result = await newChat.save();
      console.log("Result", result);
      return res
        .status(201)
        .json({ msg: "Chat room created successfully", result: result });
    }

    console.log("Chat room exists");
    return res.status(200).json({ msg: "Chat found", result: existRoom });
  } catch (err) {
    console.log("Error in create chat", err);
    res.status(500).json({ msg: "Error in create chat" });
  }
};

const userChat = async (req, res) => {
  try {
    console.log("Welcome to userchat", req.params.userId);
    const chat = await chatModel.findOne({
      bookingId: req.params.userId,
    });
    res.status(200).json(chat);
  } catch (err) {
    console.log("Error in create chat ", err);
    res.status(500).json({ msg: "Error in user chat" });
  }
};

const providerChat = async (req, res) => {
  try {
    console.log("Welcome to userchat", req.params.userId);
    const chat = await chatModel.find({
      members: { $in: [req.params.userId] },
    });
    res.status(200).json(chat);
  } catch (err) {
    console.log("Error in create chat ", err);
    res.status(500).json({ msg: "Error in user chat" });
  }
};

// const createChat = async (req, res) => {
//   try {
//     console.log("Welcome to create chat ");
//     const newChat = new chatModel({
//       members: [req.body.senderId, req.body.receiverId],
//     });
//     const result = await newChat.save();
//     console.log("Result", result);
//     res.status(200).json({ msg: "chat created successfully", result: result });
//   } catch (err) {
//     console.log("Error in create chat ", err);
//     res.status(500).json({ msg: "Error in create chat" });
//   }
// };

// const userChat = async (req, res) => {
//   try {
//     console.log("Welcome to userchat", req.params.userId);
//     const chat = await chatModel.find({
//       members: { $in: [req.params.userId] },
//     });
//     res.status(200).json(chat);
//   } catch (err) {
//     console.log("Error in create chat ", err);
//     res.status(500).json({ msg: "Error in user chat" });
//   }
// };

const findChat = async (req, res) => {
  try {
    const chat = await chatModel.findOne({
      members: { $all: [req.params.firstId, req.params.secondId] },
    });
    res.status(200).json(chat);
  } catch (err) {
    console.log("Error in find chat", err);
    res.status(500).json({ msg: "Error in findChat chat" });
  }
};

//Message

const sendMessage = async (req, res) => {
  try {
    console.log("Welcome to send Message ");

    const { senderId, chatId, text } = req.body;
    console.log("senderId",senderId)
    console.log("Text",text)




    const message = new messageModel({
      senderId,
      chatId,
      text,
    });
    const result = await message.save();
    res.status(200).json(result);
  } catch (err) {
    console.log("Error in send Message", err);
    res.status(500).json({ msg: "Error in send Message" });
  }
};

const getMessage = async (req, res) => {
  try {
    console.log("Welcome to get message", req.params, req.body);
    const { chatId } = req.params;

    // const { userToken, role, userId } = req.decoded;
    // console.log(userToken, role);
    const chat = await messageModel.find({
      chatId,
    });
    console.log(chat);
    res.status(200).json(chat);
  } catch (err) {
    console.log("Error in gett message", err);
    res.status(500).json({ msg: "Error in get message" });
  }
};

//recepient data
const recipientData = async (req, res) => {
  try {
    console.log("Welcome to getting the recipient data", req.params);
    const { recId } = req.params;
    console.log("Iam receipient", recId);

    const recData = await providerModel.findOne({ _id: recId });
    console.log("recData IN PROVIDER", recData);

    if (!recData) {
      const recData = await userModel.findOne({ _id: recId });
      console.log("recData IN USER", recData);
      return res.status(200).json(recData);
      // return res.status(404).json({ message: "Recipient not found" });
    }

    console.log("Second User", recData);

    return res.status(200).json(recData);
  } catch (err) {
    console.error("Error in getting the recipient data", err);

    return res
      .status(500)
      .json({ message: "Error in getting the recipient data" });
  }
};

//Provider

const getProviderChats = async (req, res) => {
  try {
    console.log("Welcome to userchat", req.params.userId);
    const chat = await chatModel.findOne({
      bookingId: req.params.userId,
    });
    res.status(200).json(chat);
  } catch (err) {
    console.log("Error in create chat ", err);
    res.status(500).json({ msg: "Error in user chat" });
  }
};

const getLastMessage = async(req,res)=>{
  try{
    console.log("Welcome to last message",req.params)
    const {recId} = req.params
    const lastMessage = await messageModel.findOne({}).sort({createdAt:-1}).limit(1)
    console.log("LastMessge ",lastMessage)


  }catch(err){
    consolelo.log("Error in getting lat message",err)

  }
}








module.exports = {
  createChat,
  userChat,
  findChat,
  sendMessage,
  getMessage,
  recipientData,

  getProviderChats,
  providerChat,
  getLastMessage
};
