import { validationResult } from "express-validator"
import {ApiError} from "../utils/ApiError.js"



const validate = (req, res, next )=>{
    const errors = validationResult(req)
    if(errors.isEmpty()){
        next()
    }

    const extractedErrors = []
    errors.array().map((error)=>{
        extractedErrors.push({[error.path]:error.msg})
    })

    throw new ApiError(422, "Received Data is not valid", extractedErrors)
}

export {
    validate
}