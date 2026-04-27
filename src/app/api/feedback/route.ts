import { createClient } from "@/utils/supabase/server";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        { error: "Unauthorized. Feedback can only be submitted by logged-in users." },
        { status: 401 }
      );
    }

    const { category, content, email } = await request.json();

    if (!category || !content) {
      return NextResponse.json(
        { error: "Category and content are required." },
        { status: 400 }
      );
    }

    const { error } = await supabase
      .from("feedback")
      .insert({
        user_id: user.id,
        email: email || user.email,
        category,
        content,
        status: "pending"
      });

    if (error) throw error;

    return NextResponse.json({ message: "Feedback submitted successfully!" });
  } catch (error: any) {
    console.error("Feedback submission error:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
