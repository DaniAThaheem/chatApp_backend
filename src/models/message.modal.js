import mongoose, {model, Schema} from "mongoose";


const chatMessageSchema = new Schema(
    {
        content:{
            type:String,
            required:true
        },
        attachments:{
            type:[
                {
                    url:String,
                    localPath:String
                }
            ],
            default:[]
        },
        chat:{
            type:mongoose.Schema.Types.ObjectId,
            ref:"Chat"
        },
        sender:{
            type:mongoose.Schema.Types.ObjectId,
            ref:"User"
        }
    },
    {
        timestamps:true
    }
)

export const ChatMessage = mongoose.model("ChatMessage", chatMessageSchema)