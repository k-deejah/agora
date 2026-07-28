import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { expect, afterEach, describe, it, vi } from "vitest";
import { cleanup } from "@testing-library/react";
import "@testing-library/jest-dom";
import SubscriptionsSettingsPage from "../app/settings/subscriptions/page";

// Mock next/image
vi.mock("next/image", () => ({
  default: ({ src, alt, width, height, className }: { src: string; alt: string; width: number; height: number; className?: string }) => (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={src} alt={alt} width={width} height={height} className={className} />
  ),
}));

// Mock next/navigation
vi.mock("next/navigation", () => ({
  usePathname: vi.fn(() => "/settings/subscriptions"),
  useRouter: vi.fn(() => ({
    push: vi.fn(),
  })),
}));

// Mock layout components
vi.mock("@/components/layout/navbar", () => ({
  Navbar: () => <div data-testid="navbar">Mock Navbar</div>,
}));

vi.mock("@/components/layout/footer", () => ({
  Footer: () => <div data-testid="footer">Mock Footer</div>,
}));

// Mock global fetch
const mockFetch = vi.fn();
global.fetch = mockFetch;

describe("SubscriptionsSettingsPage", () => {
  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it("renders subscription details and active series passes correctly", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        subscription: {
          tier: "basic",
          isActive: false,
          expiresAt: null,
          price: "0",
        },
        seriesPasses: [
          {
            id: "pass-test",
            eventName: "Vitest Testing Series",
            validFrom: "2026-02-01T00:00:00.000Z",
            validTo: "2026-08-31T23:59:59.000Z",
            remainingUses: 4,
            totalUses: 8,
          },
        ],
      }),
    });

    render(<SubscriptionsSettingsPage />);

    // Verify loading state is shown initially
    expect(screen.getByText(/Loading Subscriptions.../i)).toBeInTheDocument();

    // Wait for the fetch resolution and check page structure
    await waitFor(() => {
      expect(screen.queryByText(/Loading Subscriptions.../i)).not.toBeInTheDocument();
    });

    expect(screen.getByText("Agora Pro Organiser")).toBeInTheDocument();
    expect(screen.getByText("Basic subscription (free)")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Subscribe to Pro/i })).toBeInTheDocument();

    // Verify active series pass card elements
    expect(screen.getByText("Vitest Testing Series")).toBeInTheDocument();
    expect(screen.getByText("4 / 8")).toBeInTheDocument();
  });

  it("handles subscribing flow and updates toggle status UI", async () => {
    mockFetch
      // GET fetch initially
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          subscription: {
            tier: "basic",
            isActive: false,
            expiresAt: null,
            price: "0",
          },
          seriesPasses: [],
        }),
      })
      // POST subscribe fetch
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          subscription: {
            tier: "pro",
            isActive: true,
            expiresAt: "2026-08-27T00:00:00.000Z",
            price: "29.99",
          },
        }),
      });

    render(<SubscriptionsSettingsPage />);

    await waitFor(() => {
      expect(screen.queryByText(/Loading Subscriptions.../i)).not.toBeInTheDocument();
    });

    const subscribeBtn = screen.getByRole("button", { name: /Subscribe to Pro/i });
    fireEvent.click(subscribeBtn);

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledTimes(2);
    });

    // Subscribed state check
    expect(screen.getByText("★ Active")).toBeInTheDocument();
    expect(screen.getByText(/Pro Subscription active/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Cancel Subscription/i })).toBeInTheDocument();
  });

  it("handles cancelling flow and updates toggle status UI back", async () => {
    mockFetch
      // GET fetch initially
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          subscription: {
            tier: "pro",
            isActive: true,
            expiresAt: "2026-08-27T00:00:00.000Z",
            price: "29.99",
          },
          seriesPasses: [],
        }),
      })
      // POST cancel fetch
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          subscription: {
            tier: "pro",
            isActive: false,
            expiresAt: "2026-07-27T00:00:00.000Z",
            price: "29.99",
          },
        }),
      });

    render(<SubscriptionsSettingsPage />);

    await waitFor(() => {
      expect(screen.queryByText(/Loading Subscriptions.../i)).not.toBeInTheDocument();
    });

    expect(screen.getByText("★ Active")).toBeInTheDocument();
    const cancelBtn = screen.getByRole("button", { name: /Cancel Subscription/i });
    fireEvent.click(cancelBtn);

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledTimes(2);
    });

    // Cancelled state check
    expect(screen.queryByText("★ Active")).not.toBeInTheDocument();
    expect(screen.getByText("Basic subscription (free)")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Subscribe to Pro/i })).toBeInTheDocument();
  });
});
