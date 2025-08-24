import mongoose from "mongoose"
import { ApiError } from "../utils/ApiError.js"

//get the error
const errorHandler = (err, req, res, _)=>{
    let error = err
    if(!(error instanceof ApiError)){
        //check if the the error has the status code or the error is the instance of the mongoose error
        const statusCode = error.statusCode || error instanceof mongoose.Error?500:400
        //check if the error has the message or give a string
        const message = error.message||"Something went wrong"
        //make an instance of thee api error
        error = new ApiError(statusCode, message, error?.errors, err.stack)
        //create a rsesponse withe api error error message and error stack
        const response = {
            ...error,
            message:error.message,
            ...(process.env.NODE_ENV==="development"?err.stack:{})
        }
        //remove unused multer files on error
        //return the response
        return res.status(statusCode).json(response)
    }
}

export default errorHandler