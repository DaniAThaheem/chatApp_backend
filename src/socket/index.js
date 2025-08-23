import { ChatEventEnum } from "../constants.js"
import cookie from "cookie"
import {ApiError} from "../utils/ApiError.js"
import jwt from "jsonwebtoken"
import {User} from "../models/user.model.js"




const mountJoinChatEvent = (socket)=>{
    socket.on(ChatEventEnum.JOIN_CHAT_EVENT, (chatId)=>{
        console.log("User joined the chat. ChatID: ", chatId)
        socket.join(chatId)
    })
}

const mountParticipantTypingEvent = (socket)=>{
    socket.on(ChatEventEnum.TYPING_EVENT, (chatId)=>{
        socket.in(chatId).emit(ChatEventEnum.TYPING_EVENT, chatId)

    })
}

const mountParticipantStoppedTypingEvent = (socket)=>{
    socket.on(ChatEventEnum.STOP_TYPING_EVENT, (chatId)=>{
        socket.in(chatId).emit(ChatEventEnum.STOP_TYPING_EVENT, chatId)
    })
}


const initializeSocketIO = (io)=>{
    return io.on("connection", async(socket)=>{
        try {
            //get cookies
            //fetch token from cookies
            //if not found token check in the handshake.auth
            //if still not found then return error
            //if found then verify the token
            //fetch the user from the token
            //if the user not found then send error
            //if the user is found then add an object in the socket
            //join the user id in the room
            //emit the connect event
            //mount the other events
            //mount the disconnect event


            const cookies = cookie.parse(socket.handshake?.headers?.cookie)
            let token = cookies?.accessToken
            if(!token){
              token = socket.handshake.auth?.token 
            }
            if(!token){
                throw new ApiError(401, "Unauthorized ... could not find token")
            }
            const decodedToken = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET)
            if(!decodedToken){
                throw new ApiError(401, "Invalid Token... could not verify")
            }
            const user = await User.findById(decodedToken?._id).select("-password -refreshToken -emailVerificationToken -emailVerificationExpiry")
            if(!user){
                throw new ApiError(401, "Invalid Token ... could not find user")
            }
            socket.user = user

            socket.join(user?._id.toString())
            socket.emit(ChatEventEnum.CONNECTED_EVENT)
            console.log("User connected: user._id ", user?._id)
            mountJoinChatEvent(socket)
            mountParticipantTypingEvent(socket)
            mountParticipantStoppedTypingEvent(socket)
            socket.on(ChatEventEnum.DISCONNECT_EVENT, ()=>{
                console.log("User disconnected userID: ", socket.user?._id)
                if(socket.user?._id){
                    socket.leave(user?._id)
                }
            })
            
        } catch (error) {
            socket.emit(
                ChatEventEnum.SOCKET_ERROR_EVENT,
                error.message || "Something went wrong while connecting"
            )
            
        }
    })
}

const  emitSocketEvent = (req, roomId, event, payload)=>{
    req.app.get("io").in(roomId).emit(event, payload)
}

export {initializeSocketIO, emitSocketEvent}