import {Router} from "express"
import {
    searchAvailableUsers,
    createAOneOnOneChat,
    createAGroupChat,
    getGroupChatDetails,
    renameAGroup,
    deleteGroupChat,
    deleteOneOnOneChat,
    leaveGroupChat,
    addParticipantInGroupChat,
    removeParticipantsFromGroupChat,
    getAllChats

} from "../controllers/chat.controllers.js"
import {
    jwtVerify
} from "../middlewares/auth.middleware.js"
import {
    createAGroupChatValidator,
    updateGroupNameValidator
} from "../validators/chat.validator.js"
import {
    mongoIdPathVariableValidator,
} from "../validators/mongoId.validator.js"
import {
    validate
} from "../validators/validate.js"


const router = Router()

router.use(jwtVerify)

router.route("/")
    .get(getAllChats)

router.route("/users")
    .get(searchAvailableUsers)

router.route("/c/receiverId")
    .post(
        mongoIdPathVariableValidator("receiverId"),
        validate,
        createAOneOnOneChat
    )

router.route("/group")
    .post(
        createAGroupChatValidator(),
        validate,
        createAGroupChat
    )

router.route("/group/:chatId")
    .get(
        mongoIdPathVariableValidator("chatId"),
        validate,
        getGroupChatDetails
    )
    .patch(
        mongoIdPathVariableValidator("chatId"),
        updateGroupNameValidator(),
        validate,
        renameAGroup
    )
    .delete(
        mongoIdPathVariableValidator("chatId"),
        validate,
        deleteGroupChat
    )

router.route("/group/:chatId/:participantId")
    .post(
        mongoIdPathVariableValidator("chatId"),
        mongoIdPathVariableValidator("participantId"),
        validate,
        addParticipantInGroupChat
    )
    .delete(
        mongoIdPathVariableValidator("chatId"),
        mongoIdPathVariableValidator("participantId"),
        validate,
        removeParticipantsFromGroupChat
    )

router.route("/leave/group/:chatId")
    .delete(
        mongoIdPathVariableValidator("chatId"),
        validate,
        leaveGroupChat
    )

router.route("/remove/chatId")
    .delete(
        mongoIdPathVariableValidator("chatId"),
        validate,
        deleteOneOnOneChat
    )

export default router