
//Database Name
const DB_NAME = "chatApp"

//Roles Enum

const Available_Roles = {
    USER:"USER",
    ADMIN:"ADMIN"
}

const Available_Roles_Enum = Object.keys(Available_Roles)

//Login Type Enum

const Available_Login_Types = {
    EMAIL_PASSWORD:"EMAIL_PASSWORD",
    GOOGLE:"GOOGLE"
}
const Available_Login_Types_Enum = Object.keys(Available_Login_Types)

const DEFAULT_TOKEN_EXPIRY = 15 * 60 * 1000 // 15 minutes

const GMAIL = "danishabbasofficially@gmail.com"
export {
    DB_NAME,
    Available_Roles,
    Available_Roles_Enum,
    Available_Login_Types,
    Available_Login_Types_Enum,
    DEFAULT_TOKEN_EXPIRY,
    GMAIL
}