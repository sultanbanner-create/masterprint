import { NextResponse } from "next/server";
import { runAcceptanceTests } from "@/lib/calculator/test-runner";

export async function GET() {
  try {
    const data = runAcceptanceTests();
    return NextResponse.json(data);
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Ошибка выполнения тестов" },
      { status: 500 }
    );
  }
}
