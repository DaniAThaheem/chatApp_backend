import { body } from "express-validator";
import { Available_Roles_Enum} from "../constants.js"

const userRegisterValidator = ()=>{
    return [
        body("email")
        .trim()
        .notEmpty()
        .withMessage("Email is required")
        .isLowercase()
        .withMessage("Email must be in lower case")
        .isEmail()
        .withMessage("Invalid email"),
        body("username")
        .trim()
        .notEmpty()
        .withMessage("Username is required")
        .isLowercase()
        .withMessage("Username must be in lowercase")
        .isLength({min:3})
        .withMessage("Username must be atleast 3 character long"),
        body("password")
        .trim()
        .notEmpty()
        .withMessage("Password is required"),
        body("role")
        .optional()
        .isIn(Available_Roles_Enum)
        .withMessage("Invalid user role")
    ]
}

const userLoginValidator = ()=>{
    return[
        body("email")
        .trim()
        .notEmpty()
        .withMessage("Email is required")
        .isLowercase()
        .withMessage("Email must be in lower case")
        .isEmail()
        .withMessage("Invalid email"),
        body("password")
        .trim()
        .notEmpty()
        .withMessage("Password is required"),
    ]
}

const userChangePasswordValidator = ()=>{
    return [
        body("oldPassword")
        .trim()
        .notEmpty()
        .withMessage("Old Password is required"),
        body("newPassword")
        .trim()
        .notEmpty()
        .withMessage("New Password is required"),
    ]
}

const userForgotPasswordValdator = ()=>{
    return [
        body("email")
        .trim()
        .notEmpty()
        .withMessage("Email is required")
        .isLowercase()
        .withMessage("Email must be in lower case")
        .isEmail()
        .withMessage("Invalid email"),
    ]
}

const userResetPasswordValidator = ()=>{
    return [
        body("newPassword")
        .trim()
        .notEmpty()
        .withMessage("New Password is required"),
    ]
}

const userChangeRoleValidator = ()=>{
    body("role")
        .optional()
        .isIn(Available_Roles_Enum)
        .withMessage("Invalid user role")
}
export {
    userRegisterValidator,
    userLoginValidator,
    userChangePasswordValidator,
    userForgotPasswordValdator,
    userChangeRoleValidator,
    userResetPasswordValidator
}