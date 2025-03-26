import { NextRequest, NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import { getServerSession } from "next-auth";

// Initialize PrismaClient
const prisma = new PrismaClient();

export async function GET(req: NextRequest) {
    try {
        const session = await getServerSession();

        if (!session || !session.user || !session.user.email) {
            return NextResponse.json({
                message: "Unauthorized, please login"
            }, {
                status: 401
            });
        }

        // Finding the user
        const user = await prisma.user.findFirst({
            where: {
                email: session.user.email
            }
        });

        if (!user) {
            return NextResponse.json({
                message: "User not found"
            }, {
                status: 404
            });
        }

        const streams = await prisma.stream.findMany({
            where: {
                userId: user.id
            }
        });

        return NextResponse.json({
            message: "Streams fetched successfully",
            streams: streams
        });
    } catch (error) {
        console.error("Error fetching streams:", error);
        return NextResponse.json({
            message: "Error fetching streams",
            error: String(error)
        }, {
            status: 500
        });
    }
}