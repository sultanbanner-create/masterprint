import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const orderId = parseInt(params.id);
    if (isNaN(orderId)) {
      return NextResponse.json({ error: "Invalid order ID" }, { status: 400 });
    }

    const comments = await prisma.orderComment.findMany({
      where: { orderId },
      orderBy: { createdAt: "asc" },
      include: { author: true },
    });

    return NextResponse.json(comments);
  } catch (error) {
    return NextResponse.json({ error: "Failed to fetch comments" }, { status: 500 });
  }
}

export async function POST(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const orderId = parseInt(params.id);
    if (isNaN(orderId)) {
      return NextResponse.json({ error: "Invalid order ID" }, { status: 400 });
    }

    const body = await req.json();
    const { authorName, text, photoUrl, authorId } = body;

    if (!text && !photoUrl) {
      return NextResponse.json(
        { error: "Текст или фото обязательны" },
        { status: 400 }
      );
    }

    const comment = await prisma.orderComment.create({
      data: {
        orderId,
        authorName: authorName || "Мастер",
        authorId: authorId || null,
        text: text || "Прикреплен фотоотчет",
        photoUrl: photoUrl || null,
      },
      include: { author: true },
    });

    return NextResponse.json(comment, { status: 201 });
  } catch (error) {
    console.error("Error creating comment:", error);
    return NextResponse.json({ error: "Failed to add comment" }, { status: 500 });
  }
}
