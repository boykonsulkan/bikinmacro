import { createClient } from "@/utils/supabase/server";
import { NextResponse } from "next/server";
import { rateLimit } from "@/lib/rate";

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

    if (!rateLimit(`feedback:${user.id}`, 5, 60_000)) {
      return NextResponse.json({ error: "Terlalu cepat. Coba lagi sebentar lagi." }, { status: 429 });
    }

    const { category, content, email } = await request.json();

    if (typeof category !== "string" || typeof content !== "string" || content.length > 3000 || category.length > 40) {
      return NextResponse.json({ error: "Isi masukan terlalu panjang atau formatnya salah." }, { status: 400 });
    }
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
        email: user.email ?? (typeof email === "string" ? email.slice(0, 200) : null),
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
