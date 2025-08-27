import asyncHandler from "../utils/AsyncHandler.js"
import {Chat} from "../models/chat.model.js"
import { ApiError } from "../utils/ApiError.js"
import { ChatMessage } from "../models/message.modal.js"
import mongoose from "mongoose"
import {ApiResponse} from "../utils/ApiResponse.js"
import { getLocalPath, getStatiFilePath, removeLocalFile } from "../utils/Helper.js"
import { emitSocketEvent } from "../socket/index.js"
import { ChatEventEnum } from "../constants.js"

const chatMessageCommonAggregation = ()=>{
    return [
        {
            //for look up to the user
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
            //for adding field
            $addFields:{
                sender:{$first:"$sender"}
            }
            
        }
    ]
}
const getAllMessage =asyncHandler(async(req, res)=>{
    const {chatId} = req.params
    const selectedChat = await Chat.findById(chatId)
    if(!selectedChat){
        throw new ApiError(404, "Could not find the selected chat")
    }
    if(!selectedChat.participants.includes(req.user?._id)){
        throw new ApiError(400, "User is not the part of this chat")
    }

    const messages = await ChatMessage.aggregate(
        [
            {
                $match:{
                    chat: new mongoose.Types.ObjectId(chatId)
                }
            },
            ...chatMessageCommonAggregation(),
            {
                $sort:{
                    createdAt:-1
                }
            }

        ]
    )

    return res
    .status(200)
    .json(
        new ApiResponse(
            200,
            messages ||[],
            "Messages fetched successfully"
        )
    )
})
const sendMessage = asyncHandler(async(req, res)=>{
    //get the content fo the message
    //get the attachments
    //get the chat id from the params because the chat id will also responsible to tell us that where to send the message because the receiver will fetch the whole chat i think
    //get the sender id from the params
    //check validations
    //generate the url and local paths 
    //create the object
    //send the response

    const {chatId} = req.params
    const {content} = req.body


    const selectedChat = await Chat.findById(chatId)
    if(!selectedChat){
        throw new ApiError(404, "Could not find chat")
    }
    if(!content && ! req.files.attachments.length){
        throw new ApiError(
            400,
            "Content and Attachments are required"
        )
    }

    let messageFiles =[]
    if(req.files && req.files.attachments?.length >0){
        req?.files?.attachments?.map((attachment)=>{
            messageFiles?.push(
                {
                    url:getStatiFilePath(req, attachment?.filename),
                    localPath:getLocalPath(attachment?.filename)
                }
            )
        })
    }
    
    const message = await ChatMessage.create(
        {
            content,
            attachments:messageFiles,
            chat: new mongoose.Types.ObjectId(selectedChat._id),
            sender: new mongoose.Types.ObjectId(req.user._id)
        }
    )

    if(!message){
        throw new ApiError(500, "Could not create message")
    }

    const chat = await Chat.findByIdAndUpdate(
        chatId,
        {
            $set:{
                lastMessage:message._id
            }
        },
        {
            new:true
        }
    )

    const messages = await ChatMessage.aggregate([
        {
            $match:{
                _id: new mongoose.Types.ObjectId(message._id)
            }
        },
        ...chatMessageCommonAggregation()
    ])

    const receivedMessage = messages[0]
    if(!receivedMessage){
        throw new ApiError(500, "Internal Server Error")
    }

    chat.participants.forEach((participantObjectID)=>{
        if(participantObjectID.toString() === req.user._id.toString()){
            return
        }

        emitSocketEvent(
            req,
            participantObjectID.toString(),
            ChatEventEnum.MESSAGE_RECEIVED_EVENT,
            receivedMessage
        )
    })

    return res
    .status(201)
    .json(
        new ApiResponse(
            201,
            receivedMessage,
            "Message save successfully"
        )
    )
})


const deleteMessage = asyncHandler(async(req, res)=>{
    const {chatId, messageId} = req.params
    const selectedChat = await Chat.findOne(
        {
            _id:new mongoose.Types.ObjectId(chatId),
            participants:req.user?._id

        }
    )
    if(!selectedChat){
        throw new ApiError(
            404,
            "Could not find chat"
        )
    }
    const message = await ChatMessage.findOne(
        {
            _id:new mongoose.Types.ObjectId(messageId)
        }
    )
    if(!message){
        throw new ApiError(
            404,
            "Could not find message"
        )
    }
    if(message.sender.toString() !== req.user?._id?.toString()){
        throw new ApiError(
            400,
            "You are not authorized to delete the message"
        )
    }
    if(message.attachments.length>0){
        message.attachments.map((asset)=>{
            removeLocalFile(asset.localPath)
        })
    }
    await ChatMessage.deleteOne({
        _id: new mongoose.Types.ObjectId(message?._id)
    })

    if(selectedChat.lastMessage?.toString() === message?._id?.toString()){
        const lastMessage = await ChatMessage.findOne(
            {
                chat:chatId
            },
            {},
            {
                sort:{
                    createdAt:-1
                }
            }
        )

        await Chat.findByIdAndUpdate(
            chatId,
            {
                $set:{
                    lastMessage: lastMessage?lastMessage:""
                }
            }
        )
    }
    selectedChat.participants.forEach((participantObjectID)=>{
        if(participantObjectID.toString() === req.user?._id.toString()){
            return
        }

        emitSocketEvent(
            req,
            participantObjectID.toString(),
            ChatEventEnum.MESSAGE_DELETE_EVENT,
            message
        )
    })
    return res
    .status(200)
    .json(
        new ApiResponse(
            200,
            message,
            "Message deleted successfully"
        )
    )
        
})
export {
    sendMessage,
    deleteMessage,
    getAllMessage
}