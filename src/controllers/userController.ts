import { RequestHandler } from "express"
import { loginSchema, registerUserSchema } from "../schemas/userSchema"
import HTTP_STATUS from "../consts/HttpStatus"
import { CreateUserModel, deleteUserModel, findUserModel } from "../models/userModel"
import { sendVerificationCode } from "../services/sendVerificationCode"
import { validatePasswordToCreateJWT, verifyJWT } from "../services/jwt"
import { deleteCodeModel } from "../models/codeModel"
import { JwtPayload } from "jsonwebtoken"
import { handleCode } from "../services/createCode"


export const CreateUser: RequestHandler = async (req, res) => {

    // pegar os dados
    const dados = registerUserSchema.safeParse(req.body)

    // verificar os dados
    if (dados.error) {
        res.status(HTTP_STATUS.BAD_REQUEST).json({
            message: dados.error.issues[0].message
        })
        return
    }
    // mandar os dados pro model
    try {
        const { confirmPassword, ...data } = dados.data

        const user = await CreateUserModel(data)

        if (user instanceof Error) {
            res.status(HTTP_STATUS.BAD_REQUEST).json({
                message: user.message
            })
            return

        }
        if (!user) {
            throw new Error("Erro Interno")
        }
        const email = await sendVerificationCode(user.email, user.code)

        if (email) {
            res.status(HTTP_STATUS.OK).json({
                message: "Código Enviado para o Email"
            })
        }
        return


    }
    catch (e) {
        if (e instanceof Error) {
            res.status(HTTP_STATUS.BAD_REQUEST).json({
                message: e.message
            })
            return
        }
        res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
            message: "Erro Interno"
        })
        return
    }






}

export const login: RequestHandler = async (req, res) => {

    //pegar os dados de email, senha e o codigo
    const validation = loginSchema.safeParse(req.body)

    if (validation.success) {
        try {
            const user = await findUserModel(validation.data.email)
            if (user instanceof Error) {
                res.status(HTTP_STATUS.BAD_REQUEST).json({ message: user.message })
                return
            }
            if (user.status === true) {
                const jwt = await validatePasswordToCreateJWT(validation.data.password, user)
                if (jwt instanceof Error) {
                    res.status(HTTP_STATUS.BAD_REQUEST).json({
                        message: jwt.message
                    })
                    return

                }
                if (user.code) {
                    await deleteCodeModel(user.code?.id as string)
                }
                res.status(HTTP_STATUS.OK).json({
                    token: jwt
                })
                return

            }


            const code = await handleCode(user)

            if (code instanceof Error) {
                res.status(HTTP_STATUS.BAD_REQUEST).json({ message: code.message })
                return
            }

            if (code.email) {
                const email = await sendVerificationCode(code.email, code.code as string)
                res.status(HTTP_STATUS.OK).json({
                    message: email
                })
                return
            }

            res.status(HTTP_STATUS.OK).json({
                message: "Insira o código que foi enviado ao seu email",
            })
            return





        } catch {
            res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
                message: "Erro interno"
            })
            return
        }
    }
    res.status(HTTP_STATUS.BAD_REQUEST).json({
        message: validation.error?.issues[0].message
    })
    return





}

export const deleteUser: RequestHandler = async (req, res) => {

    //receber o token 
    try {
        const validatedToken = verifyJWT(req.headers.authorization ? req.headers.authorization : null)

        if (validatedToken instanceof Error) {
            throw new Error(validatedToken.message)
        }

        const { id } = validatedToken as JwtPayload
        const deleted = await deleteUserModel(id)

        if (deleted instanceof Error) {
            res.status(HTTP_STATUS.BAD_REQUEST).json({
                message: deleted.message
            })
            return
        }
        res.status(HTTP_STATUS.OK).json({
            message: "Usuário deletado com sucesso"
        })
        return





    } catch (e) {
        if (e instanceof Error) {
            res.status(HTTP_STATUS.BAD_REQUEST).json({
                message: e.message
            })
            return
        }

    }
}






