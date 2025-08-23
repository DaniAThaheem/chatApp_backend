import { body } from "express-validator";


const createAGroupChatValidator = ()=>{
    return [
        body("name")
        .trim()
        .notEmpty()
        .withMessage("Group name is required"),
        body("participants")
        .isArray(
            {
                min:2,
                max:100
            }
        )
        .withMessage("Participants must be an array and at least 2 and at mon 100")
    ]
}

const updateGroupNameValidator = ()=>{
    return [
        body("name")
        .trim()
        .notEmpty()
        .withMessage("Group name is required")
    ]
}


export {
    createAGroupChatValidator,
    updateGroupNameValidator
}