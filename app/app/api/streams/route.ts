import { NextRequest, NextResponse } from "next/server";
import { z } from "zod"
import { prismaClient } from "../../lib/db"
import { getServerSession } from "next-auth/next"

// @ts-ignore
import youtubesearchapi from "youtube-search-api"

const YT_REGEX = /^(?:https?:\/\/)?(?:www\.)?(?:m\.)?(?:youtube\.com\/(?:watch\?(?!.*\blist=)(?:.*&)?v=|embed\/|v\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})(?:[?&]\S+)?$/;

const createStreamSchema = z.object({
    url: z.string()
})

export async function POST(req: NextRequest) { 
    try {
        const session = await getServerSession();
        
        if (!session?.user?.email) {
            return NextResponse.json(
                { message: "Unauthenticated" },
                { status: 403 }
            );
        }

        const user = await prismaClient.user.findFirst({
            where: {
                email: session.user.email
            }
        });

        if (!user) {
            return NextResponse.json(
                { message: "User not found" },
                { status: 403 }
            );
        }

        const data = createStreamSchema.parse(await req.json())
        const isYt = data.url.match(YT_REGEX);
        const videoId = data.url ? data.url.match(YT_REGEX)?.[1] : null;
        if (!isYt || !videoId) {
          return NextResponse.json(
            {
              message: "Invalid YouTube URL format",
            },
            {
              status: 400,
            },
          );
        }
    
        const extractedId = data.url.split("?v=")[1];

        const res = await youtubesearchapi.GetVideoDetails(extractedId);

        const title = res.title
        const thumbnail = res.thumbnail.thumbnails

        thumbnail.sort((a: {width: number}, b: {width: number}) => a.width < b.width ? -1 : 1)

        const stream = await prismaClient.stream.create({
            data: {
                userId: user.id,
                url: data.url, 
                type: "Youtube",
                title: title ?? "Can't find Video",
                extractedId: extractedId,
                bigImage: (thumbnail[thumbnail.length - 1].url) ?? "", 
                smallImage: (thumbnail.length > 1 ? thumbnail[thumbnail.length - 2].url : thumbnail[thumbnail.length - 1].url) ?? "",
                active: true
            }
        })

        return NextResponse.json({
            message: "Added Stream",
            id: stream.id
        })
    } catch (error) {
        console.error("Error creating stream:", error);
        return NextResponse.json({
            message: "Error While Adding a Stream",
            error: String(error)
        }, {
            status: 500
        })
    }

}

export async function GET(req :  NextRequest) { 

    const creatorId = req.nextUrl.searchParams.get("creatorId") ;

    const streams  = await prismaClient.stream.findMany({
        where : { 
            userId : creatorId ?? ""
        }
    })


    return NextResponse.json({
        streams
    })

}


