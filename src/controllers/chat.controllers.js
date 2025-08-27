import asyncHandler from "../utils/AsyncHandler.js"
import {ApiError} from "../utils/ApiError.js"
import {ApiResponse} from "../utils/ApiResponse.js"
import {User} from "../models/user.model.js"
import {Chat} from "../models/chat.model.js"
import {ChatMessage} from "../models/message.modal.js"
import mongoose from "mongoose"
import {emitSocketEvent} from "../socket/index.js"
import { ChatEventEnum } from "../constants.js"
import {removeLocalFile} from "../utils/Helper.js"

const chatCommonAggregation = ()=>{
    return [
        {
            $lookup:{
                from:"users",
                foreignField:"_id",
                localField:"participants",
                as:"participants",
                pipeline:[
                    {
                        $project:{
                            password:0,
                            refreshToken:0,
                            forgotPasswordToken:0,
                            forgotPasswordExpiry:0,
                            emailVerificationToken:0,
                            emailVerificationExpiry:0
                        }
                    }
                ]
            }
        },
        {
            $lookup:{
                from:"chatmessages",
                foreignField:"_id",
                localField:"lastMessage",
                as:"lastMessage",
                pipeline:[
                    {
                        $lookup:{
                            from:"users",
                            foreignField:"_id",
                            localField:"sender",
                            as:"sender",
                            pipeline:[
                                {
                                    $project:{
                                        email:1,
                                        username:1,
                                        avatar:1
                                    }
                                }
                            ]
                        }
                    },
                    {
                        $addFields:{
                            sender:{
                                $first:"$sender"
                            }
                        }
                    }
                ]
            }
        },
        {
            $addFields:{
                lastMessage:{
                    $first:"$lastMessage"
                }
            }
        }
    ]
}

const deleteCascadeChatMessage = async(chatId)=>{
    const messages = await ChatMessage.find(
        {
            chat: new mongoose.Types.ObjectId(chatId)
        }
    )
    let attachments = []
    attachments = attachments.concat(
        ...messages.map((message)=>{
            return message.attachments
        })
    )

    attachments?.forEach((attachment)=>{
        removeLocalFile(attachment.localPath)
    })

    await ChatMessage.deleteMany(
        {
            chat: new mongoose.Types.ObjectId(chatId)
        }
    )
}

const searchAvailableUsers = asyncHandler(async(req, res)=>{
    const users = await User.aggregate(
        [
            {
                $match:{
                    _id:{
                        $ne:req.user._id
                    }
                }
            },
            {
                $project:{
                    email:1,
                    username:1,
                    avatar:1
                }
            }
        ]
    )

    return res
    .status(200)
    .json(
        new ApiResponse(
            200,
            users,
            "Users fetched successfully"
        )
    )
})

const createAOneOnOneChat = asyncHandler(async(req, res)=>{
    const {receiverId} = req.params
    const receiver = await User.findById(receiverId)
    if(!receiver){
        throw new ApiError(404, "Could not find the receiver")
    }
    if(receiver._id.toString() === req.user._id.toString()){
        throw new ApiError(400, "You can't chat with your self")
    }

    const chat = await Chat.aggregate(
        [
            {
                $match:{
                    isGroupChat:false,
                    $and:[
                        {
                            participants:{
                                $elemMatch:{
                                    $eq:req.user._id
                                }
                            }
                        },
                        {
                            participants:{
                                $elemMatch:{
                                    $eq:new mongoose.Types.ObjectId(receiverId)
                                }
                            }
                        }
                    ]
                }
            },
            ...chatCommonAggregation()
        ]
    )

    if(chat.length){
        return res
        .status(200)
        .json(
            new ApiResponse(
                200,
                chat[0],
                "Chat fetched succesfully"
            )
        )
    }

    const newChatInstance = await Chat.create(
        {
            name:"One On One Chat",
            participants:[req.user._id, new mongoose.Types.ObjectId(receiverId)],
            admin:req.user._id
        }
    )

    const createdChat = await Chat.aggregate(
        [
            {
                $match:{
                    _id:newChatInstance._id
                }
            },
            ...chatCommonAggregation()
        ]
    )

    const payload = createdChat[0]
    if(!payload){
        throw new ApiError(500, "Internal Server Error")
    }

    payload.participants.forEach((participant)=>{
        if(participant._id.toString() === req.user._id){
            return
        }
        emitSocketEvent(
            req,
            participant._id?.toString(),
            ChatEventEnum.NEW_CHAT_EVENT,
            payload
        )
    })
    return res
    .status(201)
    .json(
        new ApiResponse(
            200,
            payload,
            "New Chat Initiated Successfully"
        )
    )
})

const createAGroupChat = asyncHandler(async(req, res)=>{
    const {name, participants} = req.body

    if(participants.includes(req.user._id)){
        throw new ApiError(400, "Participants should not contain the group created")
    }

    const members = [...new Set([...participants, req.user._id.toString()])]
    if(members.length<3){
        throw new ApiError(400, "Seems you add duplicates in the group")
    }

    const groupChat = await Chat.create(
        {
            name,
            isGroupChat:true,
            participants:members,
            admin:req.user._id,

        }
    )

    const chat = await Chat.aggregate(
        [
            {
                $match:{
                    _id:groupChat._id
                }
            },
            ...chatCommonAggregation()
        ]
    )

    const payload = chat[0]
    if(!payload){
        throw new ApiError(500, "Internal Server Error")
    }

    payload?.participants.forEach((participant)=>{
        if(participant._id.toString() === req.user._id.toString()){
            return
        }
        emitSocketEvent(
            req,
            participant._id.toString(),
            ChatEventEnum.NEW_CHAT_EVENT,
            payload
        )
    })

    return res
    .status(200)
    .json(
        new ApiResponse(
            200,
            payload,
            "Group chat created successfully"
        )
    )
})

const getGroupChatDetails = asyncHandler(async(req, res)=>{
    const {chatId} = req.params

    const chat = await Chat.aggregate(
        [
            {
                $match:{
                    _id: new mongoose.Types.ObjectId(chatId)
                }
            },
            ...chatCommonAggregation()
        ]
    )

    const payload = chat[0]
    if(!payload){
        throw new ApiError(500, "Internal Server Error")
    }

    return res
    .status(200)
    .json(
        new ApiResponse( 
            200,
            payload,
            "Details fetched successfully"
        )
    )
})

const renameAGroup = asyncHandler(async(req, res)=>{
    const {name} = req.body
    const {chatId} = req.params
    console.log(chatId, name)
    const selectedChat = await Chat.findOne(
        {
            $and:[
                {_id: new mongoose.Types.ObjectId(chatId)},
                {isGroupChat: true}
            ]
        }
    )
    if(!selectedChat){
        throw new ApiError(404, "Chat does not exist")
    }
    if(selectedChat.admin.toString() !== req.user?._id?.toString()){
        throw new ApiError(400, "You are not admin")
    }

    const groupChat = await Chat.findOneAndUpdate(
        {
            _id:selectedChat._id
        },
        {
            $set:{
                name
            }
        },
        {
            new:true
        }
    )

    console.log(groupChat)
    const chat = await Chat.aggregate(
        [
            {
                $match:{
                    _id:new mongoose.Types.ObjectId(groupChat._id)
                }
            },
            ...chatCommonAggregation()
        ]
    )

    const payload = chat[0]

    payload?.participants.forEach((participant)=>{
        if(participant._id.toString() === req.user._id.toString()){
            return 
        }
        emitSocketEvent(
            req,
            participant._id.toString(),
            ChatEventEnum.UPDATE_GROUP_NAME_EVENT,
            payload
        )
    })
    return res
    .status(200)
    .json(
        new ApiResponse(
            200,
            payload,
            "Group name updated successfully"
        )
    )
})

const deleteGroupChat = asyncHandler(async(req, res)=>{
    const {chatId} = req.params

    const groupChat = await Chat.aggregate(
        [
            {
                $match:{
                    _id: new mongoose.Types.ObjectId(chatId),
                    isGroupChat:true
                }
            },
            ...chatCommonAggregation()
        ]
    )
    const chat = groupChat[0]
    if(!chat){
        throw new ApiError(400, "Chat does not exist")
    }
    if(chat.admin.toString() !== req.user._id.toString()){
        throw new ApiError(
            400,
            "Only admin can delete chat"
        )
    }

    await Chat.findByIdAndDelete(chatId)
    await deleteCascadeChatMessage(chatId)

    chat.participants.forEach((participant)=>{
        if(participant._id.toString() === req.user._id.toString()){
            return
        }

        emitSocketEvent(
            req,
            participant._id.toString(),
            ChatEventEnum.LEAVE_CHAT_EVENT,
            chat
        )
    })

    return res
    .status(200)
    .json(
        new ApiResponse(
            200,
            {},
            "Group chat deleted successfully"
        )
    )
})
const deleteOneOnOneChat = asyncHandler(async(req, res)=>{
    const {chatId} = req.params

    const chat = await Chat.aggregate(
        [
            {
                $match:{
                    _id: new mongoose.Types.ObjectId(chatId)
                }
            },
            ...chatCommonAggregation()
        ]
    )
    const payload = chat[0]
    if(!payload){
        throw new ApiError(400, "Chat does not exist")
    }
    if(payload.admin.toString() !== req.user._id.toString()){
        throw new ApiError(
            400,
            "Only admin can delete chat"
        )
    }

    await Chat.findByIdAndDelete(chatId)
    await deleteCascadeChatMessage(chatId)

    const otherParticipant = payload.participants.find((participant) => participant._id.toString() !== req.user._id.toString())
    emitSocketEvent(
        req,
        otherParticipant._id.toString(),
        ChatEventEnum.LEAVE_CHAT_EVENT,
        chat
    )

    return res
    .status(200)
    .json(
        new ApiResponse(
            200,
            {},
            "One-on-One chat deleted successfully"
        )
    )
})

const leaveGroupChat = asyncHandler(async(req, res)=>{
    const {chatId} = req.params

    const groupChat = await Chat.findOne(
        {
            _id:new mongoose.Types.ObjectId(chatId),
            isGroupChat:true
        }
    )

    if(!groupChat){
        throw new ApiError(400, "Could not find group chat")
    }
    const existingParticipants = groupChat.participants
    if(!existingParticipants.includes(req.user._id)){
        throw new ApiError(400, "You are not participant of the chat")
    }

    const updatedChat = await Chat.findByIdAndUpdate(
        chatId,
        {
            $pull:{
                participants:req.user._id
            }
        },
        {new:true}
    )

    const chat = await Chat.aggregate(
        [
            {
                $match:{
                    _id:updatedChat._id,
                    isGroupChat:true
                }
            },
            ...chatCommonAggregation()
        ]
    )
    const payload = chat[0]
    if(!payload){
        throw new ApiError(500, "Internal Server Error")
    }

    return res
    .status(200)
    .json(
        new ApiResponse(
            200,
            payload,
            "Group left successfully"
        )
    )
})
const addParticipantInGroupChat = asyncHandler(async(req, res)=>{
    const {chatId, participantId} = req.params
    const chat = await Chat.findOne(
        {
            _id: new mongoose.Types.ObjectId(chatId),
            isGroupChat:true
        }
    )
    if(!chat){
        throw new ApiError(400, "Chat does not exist")
    }
    const existingParticipants = chat.participants
    if(existingParticipants.includes(participantId)){
        throw new ApiError(400, "Participant already exist")
    }
    const updatedChat = await Chat.findByIdAndUpdate(
        chatId,
        {
            $push:{
                participants:participantId
            }
        },
        {
            new:true
        }
    )

    const groupChat = await Chat.aggregate(
        [
            {
                $match:{
                    _id:updatedChat._id
                }
            },
            ...chatCommonAggregation()
        ]
    )
    const payload = groupChat[0]
    if(!payload){
        throw new ApiError(500, "Internal Server Error")
    }

    emitSocketEvent(
        req,
        participantId,
        ChatEventEnum.NEW_CHAT_EVENT,
        payload
    )
    return res
    .status(200)
    .json(
        new ApiResponse(
            200,
            payload,
            "Participant added successfully"
        )
    )
})

const removeParticipantsFromGroupChat = asyncHandler(async(req, res)=>{
    const {chatId, participantId} = req.params
    const chat = await Chat.findOne(
        {
            _id: new mongoose.Types.ObjectId(chatId),
            isGroupChat:true
        }
    )
    if(!chat){
        throw new ApiError(400, "Chat does not exist")
    }
    if(chat.admin.toString() !== req.user._id.toString()){
        throw new ApiError(400, "You are not admin")
    }
    const existingParticipants = chat.participants
    if(!existingParticipants?.includes(participantId)){
        throw new ApiError(400, "Participant could not be found")
    }
    const updatedChat = await Chat.findByIdAndUpdate(
        chatId,
        {
           $pull:{
                    participants:participantId
            }            
        },
        {
            new:true
        }
    )
    console.log(updatedChat, "here is updated chat")
    const groupChat = await Chat.aggregate(
        [
            {
                $match:{
                    _id:updatedChat._id
                }
            },
            ...chatCommonAggregation()
        ]
    )
    const payload = groupChat[0]
    if(!payload){
        throw new ApiError(500, "Internal Server Error")
    }

    emitSocketEvent(
        req,
        participantId,
        ChatEventEnum.LEAVE_CHAT_EVENT,
        payload
    )
    return res
    .status(200)
    .json(
        new ApiResponse(
            200,
            payload,
            "Participant removed successfully"
        )
    )
})

const getAllChats = asyncHandler(async(req, res)=>{
    const chats  = await Chat.aggregate(
        [
            {
                $match:{
                    participants:{
                        $elemMatch:{
                            $eq:req.user._id
                        }
                    }
                }
            },
            {
                $sort:{
                    updatedAt:-1
                }
            },
            ...chatCommonAggregation()
        ]
    )
    return res
    .status(200)
    .json(
        new ApiResponse(
            200,
            chats||[],
            "All chats fetched successfully"
        )
    )
})
export {
    searchAvailableUsers,
    createAOneOnOneChat,
    createAGroupChat,
    getGroupChatDetails,
    renameAGroup,
    deleteGroupChat,
    deleteOneOnOneChat,
    leaveGroupChat,
    addParticipantInGroupChat,
    removeParticipantsFromGroupChat,
    getAllChats
}