import { NextResponse } from "next/server";
import { getSchedule } from "@/lib/schedule";

// Fetch di server, jadi bebas CORS dan cache-nya kita yang atur.
export const revalidate = 300;

export async function GET() {
  return NextResponse.json(await getSchedule());
}
