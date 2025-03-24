import { NextRequest, NextResponse } from "next/server";
import {z} from "zod"
import {primaClient} from "../../lib/db"

// @ts-ignore
import youtubesearchapi from "youtube-search-api"

const YT_REGEX = new RegExp(" https?:\/\/(www\.)?youtube\.com\/watch\?v=[\w-]{11}")


const createStreamSchema  = z.object({
    createrId : z.string(),
    url : z.string()
})

export async function POST(req : NextRequest) { 
    try{
        const data = createStreamSchema.parse(await req.json())
        const isYt = YT_REGEX.test(data.url);

        if (!isYt ) {
            return NextResponse.json({
                message : "Error While Adding a Stream"
            } , {
                status :411
            })
        }

        const extractedId = data.url.split("?v=")[1];

        const res = youtubesearchapi.GetVideoDetails(extractedId);

        const title = res.title
        const thumbnail  = res.thumbnail.thumbnails

        thumbnail.sort((a:{width:number},b : {width:number}) => a.width < b.width ? -1 : 1 )


        const stream = await primaClient.Stream.create({
            userId: data.createrId, 
            url : data.url , 
            extractedId: extractedId,
            type : "Youtube",
            title : title ?? " Can't find Video" ,
            bigImage : (thumbnail[thumbnail.length - 1 ].url  ) ?? "", 
            smallImage  : (thumbnail.length > 1 ? thumbnail[thumbnail.length - 2  ].url :   thumbnail[thumbnail.length - 1 ].url) ?? ""
        })

        return NextResponse.json({
            message : "Added Stream",
            id: stream.id
        })
    }catch(error){
        return NextResponse.json({
            message : "Error While Adding a Stream"
        } , {
            status :411
        })
    }

}

export async function GET(req :  NextRequest) { 

    const creatorId = req.nextUrl.searchParams.get("creatorId") ;

    const streams  = await primaClient.Stream.findMany({
        where : { 
            userId : creatorId ?? ""
        }
    })


    return NextResponse.json({
        streams
    })

}


