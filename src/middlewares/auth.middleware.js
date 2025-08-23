import {ApiError} from "../utils/ApiError.js"
import jwt from "jsonwebtoken"
import {User} from "../models/user.model.js"

const jwtVerify = async(req, _, next)=>{
    try {
        const token = req.cookies?.accessToken || req.header("Authorization").replace("Bearer ", "")
        if(!token){
            throw new ApiError(401, "Unauthorized Request...... Could not find access token")
        }
        const decodedToken = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET)
        if(!decodedToken){
            throw new ApiError(404, "Invalid Token..... Could not verify")
        }
        const user = await User.findById(decodedToken._id).select("-password -refreshToken -emailVerificationToken -emailVerificationExpiry")
        if(!user){
            throw new ApiError(404, "Could not find the user")
        }
        req.user = user
        next()
    } catch (error) {
        throw new ApiError(401, error?.message||"Invalid Token")
    }
}

export {jwtVerify}