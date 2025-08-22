import mongoose, {Schema} from "mongoose";

const chatSchema = new Schema(
    {
        name:{
            type:String,
            required:true
        },
        lastMesssage:{
            type:mongoose.Schema.Types.ObjectId,
            ref:"ChatMessage"
        },
        isGroupChat:{
            type:Boolean,
            default:false
        },
        admin:{
            type:mongoose.Schema.Types.ObjectId,
            ref:"User"
        },
        participants:[
                {
                    type:mongoose.Schema.Types.ObjectId,
                    ref:"User"
                }
        ]
    },
    {
        timestamps:true
    }
)


export const Chat = mongoose.model("Chat", chatSchema)