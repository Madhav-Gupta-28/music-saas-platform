import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import {primaClient} from "../../../lib/db"
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

    const user = await primaClient.User.findFirst({
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
        await primaClient.UpVotes.delete({
            where : {
                streamId : data.streamId,
                userId : user.id
            }

        })
   }catch(error){
        return NextResponse.json({
            message : "Error while upvoting"
        },{
            status: 403
        })
   }






}