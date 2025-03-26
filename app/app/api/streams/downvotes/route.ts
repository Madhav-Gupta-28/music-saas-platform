import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import {prismaClient} from "../../../lib/db"
import { getServerSession } from "next-auth";


const upvoteSchema = z.object({
    streamId : z.string()
})

export async function POST(req : NextRequest ){

    const session = await  getServerSession()

    if (!session?.user?.email){
        return NextResponse.json({
            message : "Unauthenticated "
        },{
            status: 403
        })
    }

    const user = await prismaClient.user.findFirst({
        where : {
            email : session.user.email
        }
    })

    if (!user){
        return NextResponse.json({
            message : "user not found "
        },{
            status: 403
        })
    }

   try{
        const data = upvoteSchema.parse(await req.json());
        await prismaClient.upVotes.delete({
            where : {
                streamId_userId : {
                    streamId : data.streamId,
                    userId : user.id
                }
            }   

        })

        return NextResponse.json({
            message : "Downvoted successfully"
        },{
            status : 200
        })
   }catch(error){
        return NextResponse.json({
            message : "Error while downvoting"
        },{
            status: 403
        })
   }






}