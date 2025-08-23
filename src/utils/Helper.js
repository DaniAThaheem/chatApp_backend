import { log } from "console"
import fs from "fs"



export const removeLocalFile = (localPath)=>{
    fs.unlink(localPath, (err)=>{
        if(err){
            console.log("Error while removing file locally")
        }
        else{
            console.log("File remove successfully ", localPath);
            
        }
    })
}

export const getStatiFilePath = (req, filename)=>{
    return `${req.protocol}://${req.get("host")}/images/${filename}`
}

export const getLocalPath = (filename)=>{
    return `public/images/${filename}`
}