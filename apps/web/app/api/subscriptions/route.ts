import { NextRequest, NextResponse } from "next/server";

const DEFAULT_SERIES_PASSES = [
  {
    id: "pass-1",
    eventName: "Tech Conference Series 2026",
    validFrom: "2026-01-01T00:00:00.000Z",
    validTo: "2026-12-31T23:59:59.000Z",
    remainingUses: 5,
    totalUses: 10,
  },
  {
    id: "pass-2",
    eventName: "Summer Music Festivals",
    validFrom: "2026-06-01T00:00:00.000Z",
    validTo: "2026-09-30T23:59:59.000Z",
    remainingUses: 3,
    totalUses: 5,
  },
];

export async function GET(request: NextRequest) {
  try {
    const statusCookie = request.cookies.get("user_subscription_status")?.value;
    
    let subscription = {
      tier: "basic",
      isActive: false,
      expiresAt: null,
      price: "0",
    };

    if (statusCookie) {
      try {
        subscription = JSON.parse(statusCookie);
      } catch {
        // Fallback if cookie parsing fails
      }
    }

    return NextResponse.json({
      subscription,
      seriesPasses: DEFAULT_SERIES_PASSES,
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Failed to fetch subscriptions data" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const { action } = await request.json();

    if (!action || (action !== "subscribe" && action !== "cancel")) {
      return NextResponse.json({ error: "Invalid action type" }, { status: 400 });
    }

    let subscription;
    if (action === "subscribe") {
      subscription = {
        tier: "pro",
        isActive: true,
        expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
        price: "29.99",
      };
    } else {
      // cancel subscription
      subscription = {
        tier: "pro",
        isActive: false,
        expiresAt: new Date().toISOString(), // expired now
        price: "29.99",
      };
    }

    const response = NextResponse.json({
      success: true,
      subscription,
    });

    response.cookies.set("user_subscription_status", JSON.stringify(subscription), {
      path: "/",
      maxAge: 60 * 60 * 24 * 30, // 30 days
      httpOnly: true,
      sameSite: "lax",
    });

    return response;
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Failed to perform subscription action" },
      { status: 500 }
    );
  }
}
