import { Router } from "express";
import {
    sendMessage,
    deleteMessage,
    getAllMessage
} from "../controllers/message.controllers.js"
import { 
    sendMessageValidator 
} from "../validators/message.validator.js"
import { 
    mongoIdPathVariableValidator 
} from "../validators/mongoId.validator.js"
import {
    validate
} from "../validators/validate.js"
import {
    jwtVerify
} from "../middlewares/auth.middleware.js"
import {
    upload
} from "../middlewares/multer.middleware.js"

const router = Router()

router.use(jwtVerify)

router.route("/:chatId")
    .get(
        mongoIdPathVariableValidator("chatId"),
        validate,
        getAllMessage
    )
    .post(
        upload.fields([
            {
                name:"attachments",
                maxCount:5
            }
        ]),
        mongoIdPathVariableValidator("chatId"),
        sendMessageValidator(),
        validate,
        sendMessage
    )

router.route("/:chatId/:messageId")
    .delete(
        mongoIdPathVariableValidator("chatId"),
        mongoIdPathVariableValidator('messageId'),
        validate,
        deleteMessage
    )

router.route(

)
export default router