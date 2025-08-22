import mongoose, {Schema} from "mongoose";
import { Available_Login_Types, Available_Roles, Available_Roles_Enum, DEFAULT_TOKEN_EXPIRY } from "../constants";
import mongooseAggregatePaginate from "mongoose-aggregate-paginate-v2";
import bcrypt from "bcrypt"
import jwt from "jsonwebtoken"
import crypto from "crypto"

const userSchema = new Schema(
    {
        avatar:{
            type:{
                url:String,
                localPath:String
            },
            default:{
                url:"",
                localPath:""
            }
        },
        username:{
            type:String,
            required:true,
            unique:true,
            lowercase:true,
            trim:true,
            index:true
        },
        email:{
            tyep:String,
            required:true,
            unique:true,
            lowercase:true,
            trim:true
        },
        role:{
            type:String,
            enum:Available_Roles_Enum,
            default:Available_Roles.USER
        },
        password:{
            type:String,
            required:[true, "Password is required"]
        },
        loginType:{
            type:String,
            enum:Available_Roles_Enum,
            default:Available_Login_Types.EMAIL_PASSWORD
        },
        isEmailVerified:{
            type:Boolean,
            default:false
        },
        refreshToken:{
            type:String,
        },
        forgotPasswordToken:{
            type:String
        },
        forgotPasswordExpiry:{
            type:Date
        },
        emailVerificationToken:{
            type:String
        },
        emailVerificationExpiry:{
            type:Date
        }
    },
    {
        timestamps:true
    }
)

userSchema.plugin(mongooseAggregatePaginate)

userSchema.methods.isPasswordCorrect = async (password)=>{
    return await bcrypt.compare(password, this.password)    
}

userSchema.pre("save", async function(next){
    if(!this.isModified(this.password)){
        return
    }
    this.password = await bcrypt.hash(this.password, 10)
    next()
})
userSchema.methods.generateAccessToken = () =>{
    const accessToken = jwt.sign(
        {
            _id:this._id,
            email:this.email,
            username:this.username,
            role:this.role,
        },
        process.env.ACCESS_TOKEN_SECRET,
        {
            expiresIn: process.env.ACCESS_TOKEN_EXPIRY
        }
    )
    return accessToken
}

userSchema.methods.generateRefreshToken = () =>{
    const refreshToken = jwt.sign(
        {
            _id:this._id,
        },
        process.env.REFRESH_TOKEN_SECRET,
        {
            expiresIn: process.env.REFRESH_TOKEN_EXPIRY
        }
    )
    return refreshToken
}

userSchema.methods.generateTemporaryToken = () =>{
    const unhashedToken = crypto.randomBytes(20).toString("hex")
    const hashedToken = crypto.createHash("sha256").update(unhashedToken).digest("hex")
    const tokenExpiry = Date.now() + DEFAULT_TOKEN_EXPIRY
    return { unhashedToken, hashedToken, tokenExpiry }
}

export const User = mongoose.model("User", userSchema)