import { Router } from "express";
import {
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
} from "../controllers/user.controllers.js"
import {
    jwtVerify
} from "../middlewares/auth.middleware.js"
import {
    validate
} from "../validators/validate.js"
import {
    userRegisterValidator,
    userLoginValidator,
    userChangePasswordValidator,
    userForgotPasswordValdator,
    userResetPasswordValidator,
} from "../validators/user.validator.js"
import {
    mongoIdPathVariableValidator
} from "../validators/mongoId.validator.js"
import {
    upload
} from "../middlewares/multer.middleware.js"


const router = Router()

router.route("/register")
    .post(
        userRegisterValidator(),
        validate,
        registerUser
    )

router.route("/login")
    .post(
        userLoginValidator(),
        validate,
        loginUser
    )

router.route("/refresh-token")
    .post(
        refreshAccessToken
    )

router.route("/verify-email/:token")
    .get(verifyEmail)

router.route("/forgot-password")
    .post(
        userForgotPasswordValdator(),
        validate,
        resetForgotPasswordMail
    )

router.route("/reset-password/:token")
    .post(
        userResetPasswordValidator(),
        validate,
        resetForgotPassword
    )

//secured routes

router.route("/logout")
    .post(
        jwtVerify, 
        logoutUser
    )

router.route("/avatar")
    .patch(
        jwtVerify, 
        upload.single("avatar"), 
        updateUserAvatar
    )

router.route("/change-password")
    .patch(
        jwtVerify,
        userChangePasswordValidator(),
        validate,
        changeCurrentPassword
    )

router.route("/current-user")
    .get(
        jwtVerify,
        getCurrentUser
    )

router.route("/resend-email-verification")
    .post(
        jwtVerify,
        resendEmailVerificationMail
    )

export default router