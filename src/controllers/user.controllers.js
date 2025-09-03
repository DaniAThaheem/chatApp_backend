import asyncHandler from "../utils/AsyncHandler.js"
import {ApiError} from "../utils/ApiError.js"
import {ApiResponse} from '../utils/ApiResponse.js'
import {User} from '../models/user.model.js'
import { Available_Login_Types, Available_Roles } from "../constants.js"
import jwt from "jsonwebtoken"
import {getStatiFilePath, getLocalPath} from "../utils/Helper.js"
import {emailVerificationMailGen, resetForgotPasswordMailGen, sendMail} from "../utils/Mail.js"
import crypto from "crypto"
import { console } from "inspector"

const generateAccessAndRefreshToken = async(uid)=>{
    const user = await User.findById(uid)
    if(!user){
        throw new ApiError(400, "Could not find user")
    }

    const accessToken = await user.generateAccessToken()
    if(!accessToken){
        throw new ApiError(500, "Could not generate the access token")
    }
    const refreshToken = await user.generateRefreshToken()
    if(!refreshToken){
        throw new ApiError(500, "Could not generate the refresh token")
    }
    user.refreshToken = refreshToken
    await user.save({validateBeforeSave:false})

    return [accessToken, refreshToken]
}

const sendEmailVerificationMail = async(mailContent, subject, email)=>{
    await sendMail({email, mailContent, subject })

}
const resetForgottonPasswordMail = async(mailContent, subject, email)=>{
    await sendMail({email, mailContent, subject})
}
const registerUser = asyncHandler(async(req, res)=>{
    //check the user exist
    //create the user
    //send genrate the access and refresh token
    //send the mail
    const {email, username, password, role} = req.body
    const isUserExist = await User.findOne({
        $or:[
            {email},
            {username}
        ]
    })

    console.log(isUserExist)
    if(isUserExist){
        throw new ApiError(400, "User already exist")
    }
    const newUser = await User.create({
        email,
        username,
        password,
        role: role||Available_Roles.USER,
        loginType:Available_Login_Types.EMAIL_PASSWORD
    })
    if(!newUser){
        throw new ApiError(500, "Could not create the user")
    }
    //generate the token and send email verification mail
    const {unhashedToken, hashedToken, tokenExpiry} = newUser.generateTemporaryToken()
    newUser.emailVerificationToken=hashedToken
    newUser.emailVerificationExpiry=tokenExpiry
    newUser.save({validateBeforeSave:false})
    const verificationUrl = `${req.protocol}://${req.get("host")}/api/v1/users/verify-email/${unhashedToken}`
    const mailContentGen = emailVerificationMailGen(newUser.username, verificationUrl)
    const subject = "Verify User Email"
    await sendEmailVerificationMail(mailContentGen, subject, newUser.email)
    const user = await User.findById(newUser._id).select("-password -refreshToken -emailVerificationToken -emailVerificationExpiry -forgotPasswordToken -forgotPasswordExpiry")
    if(!user){
        throw new ApiError(500, "Error while registering user")
    }
    return res
    .status(201)
    .json(
        new ApiResponse(
            200,
            {user},
            "User registered successfully"
        )
    )
})
const loginUser = asyncHandler(async(req, res)=>{
    const {email, password} = req.body
    console.log(email, password)    
    const isUserExist = await User.findOne({
        email
    })
    console.log(isUserExist)
    if(!isUserExist){
        throw new ApiError(400, "Could not find user")
    }
    if(isUserExist.loginType !== Available_Login_Types.EMAIL_PASSWORD){
        throw new ApiError(403, `You have previously logged in via ${isUserExist.loginType} so use ${isUserExist.loginType} to login`)
    }
    const isPasswordCorrect = await isUserExist.isPasswordCorrect(password)
    if(!isPasswordCorrect){
        console.log(isPasswordCorrect)
        throw new ApiError(400, "Password is not correct")
    }
    const [accessToken, refreshToken] = await generateAccessAndRefreshToken(isUserExist._id)
    const user = await User.findById(isUserExist._id).select("-password -refreshToken -emailVerificationToken -emailVerificationExpiry -forgotPasswordToken -forgotPasswordExpiry")
    if(!user){
        throw new ApiError(500, "Error while log in")
    }
    const options = {
        httpOnly:true,
        secure:true
    }
    return res
    .status(200)
    .cookie("accessToken", accessToken, options)
    .cookie("refreshToken", refreshToken, options)
    .json(
        new ApiResponse(
            200,
            [
                {
                    user:user,
                    accessToken:accessToken,
                    refreshToken:refreshToken
                }
                
            ],
            "User logged in successfully"
            
        )
    )

})  
const logoutUser = asyncHandler(async(req, res)=>{
    const userId = await req.user._id
    const user = await User.findById(userId)
    if(!user){
        throw new ApiError(400, "Could not get user")
    }
    const newUser = await User.findByIdAndUpdate(
        user._id,
        {
            $unset:{
                refreshToken:""
            }
        },
        {new:true}
    )
    if(!newUser){
        throw new ApiError(500, "Could not update the user")
    }
    const options = {
        httpOnly:true,
        secure:true
    }
    return res
    .status(200)
    .clearCookie("accessToken", options)
    .clearCookie("refreshToken", options)
    .json(
        new ApiResponse(
            200,
            {},
            "User logged out successfully"
        )
    )
})

const getCurrentUser = asyncHandler(async(req, res)=>{{
    return res
    .status(200)
    .json(
        new ApiResponse(
            200,
            req.user,
            "User returned successfully"
        )
    )
}})

const refreshAccessToken = asyncHandler(async(req, res)=>{
    const token = req.cookies?.refreshToken || req.body.refreshToken
    if(!token){
        throw new ApiError()
    }
    const decodedToken =  jwt.verify(token, process.env.REFRESH_TOKEN_SECRET)

    if(!decodedToken){
        throw new ApiError(400, "Invalid Token")
    }
    const requestedUser = await User.findById(decodedToken._id)
    if(!requestedUser){
        throw new ApiError(400, "Could not get the suer")
    }
    if(token !== requestedUser.refreshToken){
        throw new ApiError(400, "Refresh Token is used or expired")
    }
    const [accessToken, refreshToken] = generateAccessAndRefreshToken(decodedToken._id)
    const user = await User.findById(decodedToken._id).select("-password -refreshToken -emailVerificationToken -emailVerificationExpiry -forgotPasswordToken -forgotPasswordExpiry")
    if(!user){
        throw new ApiResponse(500, "Could not get user")
    }
    const options = {
        httpOnly:true,
        secure:true
    }
    return res
    .status(200)
    .cookie("accessToken", accessToken, options)
    .cookie("refreshToken", refreshToken, options)
    .json(
        new ApiResponse(
            200,
            [
                ...user,
                accessToken,
                refreshToken
            ],
            "Tokens refreshed successfully"
            
        )
    )
})
const changeCurrentPassword = asyncHandler(async(req, res)=>{
    const {oldPassword, newPassword} = req.body
    const user = await User.findById(req.user._id)
    const isPasswordCorrect = user.isPasswordCorrect(oldPassword)
    if(!isPasswordCorrect){
        throw new ApiError(400, "Invalid Password")
    }
    user.password = newPassword
    await user.save({validateBeforeSave:false})
    const newUser = await User.findById(user._id).select("-password -refreshToken -emailVerificationToken -emailVerificationExpiry -forgotPasswordToken -forgotPasswordExpiry")
    if(!newUser){
        throw new ApiError(500, "Internal Server Error")
    }
    return res
    .status(200)
    .json(
        new ApiResponse(
            200,
            {user:newUser},
            "Password Changed Successfully"
        )
    )
})
const updateUserAvatar = asyncHandler(async(req, res)=>{
    const {avatar} = req.file
    if(!avatar){
        throw new ApiError(400, "Avatar is required")
    }
    const updatedUser = await User.findByIdAndUpdate(
        req.user._id,
        {
            $set:{
                avatar:{
                    url:getStatiFilePath(req, avatar.filename),
                    localPath:getLocalPath(avatar.filename)

                }
            }
        },
        {
            new:true
        }
    )
    if(!updatedUser){
        throw new ApiError(400, "Could not update avatar")
    }

    return res
    .status(200)
    .json(
        new ApiResponse(
            200,
            {
                email:updatedUser.email,
                username:updatedUser.username,
                avatar:updatedUser.avatar
            },
            "Avatar updated successfully"
        )
    )
})

const resendEmailVerificationMail = asyncHandler(async(req, res)=>{
    const user = await User.findById(req.user._id)
    if(!user){
        throw new ApiError(400, "Could not find user")
    }
    if(user.isEmailVerified){
        throw new ApiError(400, "User email is verified")
    }
    const {unhashedToken, hashedToken, tokenExpiry} = user.generateTemporaryToken()
    user.emailVerificationToken=hashedToken
    user.emailVerificationExpiry=tokenExpiry
    user.save({validateBeforeSave:false})
    const verificationUrl = `${req.protocol}://${req.get("host")}/api/v1/users/verify-email/${unhashedToken}`
    const mailContentGen = emailVerificationMailGen(user.username, verificationUrl)
    const subject = "Verify User Email"
    await sendEmailVerificationMail(mailContentGen, subject, user.email)

    return res
    .status(200)
    .json(
        new ApiResponse(
            200,
            {},
            "Email sent..."
        )
    )

})
const resetForgotPasswordMail = asyncHandler(async(req, res)=>{
    const {email} = req.body
    const user = await User.findOne(
        {
            email
        }
    )
    if(!user){
        throw new ApiError(400, "Could not get user")
    }
    const {unhashedToken, hashedToken, tokenExpiry} = user.generateTemporaryToken()
    user.forgotPasswordToken=hashedToken
    user.forgotPasswordExpiry=tokenExpiry
    user.save({validateBeforeSave:false})
    const verificationUrl = `${req.protocol}://${req.get("host")}/api/v1/users/reset-forgot-password/${unhashedToken}`
    const mailContentGen = resetForgotPasswordMailGen(user.username, verificationUrl)
    const subject = "Reset Forgotton Password"
    await resetForgottonPasswordMail(mailContentGen, subject, user.email)
    return res
    .status(200)
    .json(
        new ApiResponse(
            200,
            {},
            "Mail sent..."
        )
    )
})

const resetForgotPassword = asyncHandler(async(req, res)=>{
    const {token} = req.params
    const {newPassword} = req.body
    if(!token){
        throw new ApiError(400, "Could not get the token")
    }
    const hashedToken = crypto.createHash("sha256").update(token).digest("hex")
    const user = await User.findOne(
        {
            forgotPasswordToken:hashedToken,
            forgotPasswordExpiry:{$gt:Date.now()}

        }
    )
    if(!user){
        throw new ApiError(400, "Invalid token")
    }
    user.password = newPassword
    user.forgotPasswordToken=undefined
    user.forgotPasswordExpiry=undefined
    await user.save({validateBeforeSave:false})
    return res
    .status(200)
    .json(
        new ApiResponse(
            200,
            {},
            "Password reset successfully"
        )
    )


})
const verifyEmail = asyncHandler(async(req, res)=>{
    const {token} = req.params
    if(!token){
        throw new ApiError(400, "Could not get the token")
    }
    const hashedToken = crypto.createHash("sha256").update(token).digest("hex")
    const user = await User.findOne(
        {
            emailVerificationToken:hashedToken,
            emailVerificationExpiry:{$gt:Date.now()}

        }
    )
    if(!user){
        throw new ApiError(400, "Invalid token")
    }
    user.emailVerificationToken=undefined
    user.emailVerificationExpiry=undefined
    user.isEmailVerified=true
    await user.save({validateBeforeSave:false})

    return res
    .status(200)
    .json(
        new ApiResponse(
            200,
            {},
            "Email verified successfully"
        )
    )
})
export {
    registerUser,
    loginUser,
    logoutUser,
    getCurrentUser,
    refreshAccessToken,
    changeCurrentPassword,
    updateUserAvatar,
    resendEmailVerificationMail,
    resetForgotPasswordMail,
    resetForgotPassword,
    verifyEmail
}