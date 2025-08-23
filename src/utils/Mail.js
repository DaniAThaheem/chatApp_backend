import Mailgen from "mailgen"
import nodemailer from "nodemailer"
import { GMAIL } from "../constants.js"


export const sendMail = async(options)=>{

    const mailgen = new Mailgen(
        {
            theme:"default",
            product:{
                name:"",
                link:""
            }
        }
    )

    const htmlMailContent = mailgen.generate(options.mailContent)
    const textMailContent = mailgen.generatePlaintext(options.mailContent)

    const transporter = nodemailer.createTestAccount(
        {
            service:"gmail",
            auth:{
                user:GMAIL,
                pass:process.env.GMAIL_PASSWORD
            }
        }
    )

    const mail = {
        from:GMAIL,
        to:options.email,
        subject:options.subject,
        text:textMailContent,
        html:htmlMailContent
    }

    try {
        await transporter.sendMail(mail, (err, info)=>{
            console.log("Error while sending mail", err)
            console.log("Email send", info)
        })
    } catch (error) {
        
    }

}






export const emailVerificationMainGen = (name, verifcationUrl)=>{
    return {
        body:{
            name,
            intro:"Welcome to Chat App! We are excited to have you on board",
            action:{
                instructions:"Click on the link to verify the gmail",
                button:{
                    color:"#fc0202ff",
                    text:"Verify",
                    link:verifcationUrl
                }
            },
            outro:"Need help, or have questions? Just reply to this email, we'd love to help.",
        }
    }
}

export const resetForgotPasswordMailGen = (name, verifcationUrl)=>{
    return {
        body:{
            name,
            intro:"Welcome to Chat App! We are excited to have you on board",
            action:{
                instructions:"Click on the link to reset password",
                button:{
                    color:"#fc0202ff",
                    text:"Reset Password",
                    link:verifcationUrl
                }
            },
            outro:"Need help, or have questions? Just reply to this email, we'd love to help.",
        }
    }
}