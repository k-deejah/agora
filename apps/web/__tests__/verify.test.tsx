import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { expect, afterEach, describe, it, vi } from "vitest";
import { cleanup } from "@testing-library/react";
import "@testing-library/jest-dom";
import OrganizerVerifyPage from "../app/organizers/verify/page";

// Mock next/image
vi.mock("next/image", () => ({
  default: ({ src, alt, width, height, className }: { src: string; alt: string; width: number; height: number; className?: string }) => (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={src} alt={alt} width={width} height={height} className={className} />
  ),
}));

// Mock next/navigation
vi.mock("next/navigation", () => ({
  usePathname: vi.fn(() => "/organizers/verify"),
  useRouter: vi.fn(),
}));

// Mock layout components
vi.mock("@/components/layout/navbar", () => ({
  Navbar: () => <div data-testid="navbar">Mock Navbar</div>,
}));

vi.mock("@/components/layout/footer", () => ({
  Footer: () => <div data-testid="footer">Mock Footer</div>,
}));

// Mock fetch
const mockFetch = vi.fn();
global.fetch = mockFetch;

describe("OrganizerVerifyPage", () => {
  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it("renders correctly with default state", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        profile: {
          address: "GDJ2T5Y5X3J5I5Y5X3J5I5Y5X3J5I5Y5X3J5I5Y5X3J5I5Y5X3J5",
          displayName: "Agora Organizer",
        },
      }),
    });

    render(<OrganizerVerifyPage />);

    // Verify Title and Subtitle
    expect(
      screen.getByRole("heading", { name: /Verification & Collateral Staking/i })
    ).toBeInTheDocument();
    
    // Verify Status is initially "Not Verified" (0 current stake)
    expect(screen.getByText(/Not Verified/i)).toBeInTheDocument();
    expect(screen.getByText(/0 Tokens/i)).toBeInTheDocument();

    // Verify Action Form Elements
    expect(screen.getByLabelText(/Staking Amount/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /^Stake Collateral$/i })).toBeInTheDocument();
  });

  it("generates XDR when staking is triggered", async () => {
    mockFetch
      // First fetch: profile load
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          profile: {
            address: "GDJ2T5Y5X3J5I5Y5X3J5I5Y5X3J5I5Y5X3J5I5Y5X3J5I5Y5X3J5",
            displayName: "Test Org",
          },
        }),
      })
      // Second fetch: stake XDR generation
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          xdr: "AAAAAgAAAAB...",
          contractAddress: "CDK5X3J5I5Y5X3J5I5Y5X3J5I5Y5X3J5I5Y5X3J5I5Y5X3J5I5Y5X3J5",
        }),
      });

    render(<OrganizerVerifyPage />);

    // Trigger form submit
    const stakeButton = screen.getByRole("button", { name: /^Stake Collateral$/i });
    fireEvent.click(stakeButton);

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledTimes(2);
    });

    // Verify XDR payload output is displayed on screen
    expect(screen.getByText(/Stake Collateral Transaction/i)).toBeInTheDocument();
    expect(screen.getByText("AAAAAgAAAAB...")).toBeInTheDocument();
    expect(screen.getByText(/Verified/i)).toBeInTheDocument();
  });

  it("handles unstaking countdown and withdraw XDR generation", async () => {
    mockFetch
      // Profile load
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          profile: {
            address: "GDJ2T5Y5X3J5I5Y5X3J5I5Y5X3J5I5Y5X3J5I5Y5X3J5I5Y5X3J5",
            displayName: "Test Org",
          },
        }),
      })
      // Unstake XDR generation
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          xdr: "BBBBBgAAAAB...",
          contractAddress: "CDK5X3J5I5Y5X3J5I5Y5X3J5I5Y5X3J5I5Y5X3J5I5Y5X3J5I5Y5X3J5",
        }),
      });

    render(<OrganizerVerifyPage />);

    // First make sure we have a simulated stake so unstake button is visible
    const stakeButton = screen.getByRole("button", { name: /^Stake Collateral$/i });
    
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        xdr: "AAAAAgAAAAB...",
        contractAddress: "CDK5X3J5I5Y5X3J5I5Y5X3J5I5Y5X3J5I5Y5X3J5I5Y5X3J5I5Y5X3J5",
      }),
    });
    fireEvent.click(stakeButton);

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /Initiate Unstaking/i })).toBeInTheDocument();
    });

    // Click Initiate Unstaking
    const initiateButton = screen.getByRole("button", { name: /Initiate Unstaking/i });
    fireEvent.click(initiateButton);

    // Verify lockup countdown text is visible
    expect(screen.getByText(/Lockup Countdown Timer/i)).toBeInTheDocument();

    // Fast-forward or skip the timer using the helper
    const skipLink = screen.getByText(/Skip lockup timer/i);
    fireEvent.click(skipLink);

    // Wait for the timer to reach 0
    await waitFor(() => {
      expect(screen.getByRole("button", { name: /Withdraw Collateral/i })).toBeInTheDocument();
    }, { timeout: 3000 });

    // Click Finalize Withdraw
    const withdrawButton = screen.getByRole("button", { name: /Withdraw Collateral/i });
    fireEvent.click(withdrawButton);

    await waitFor(() => {
      expect(screen.getByText("BBBBBgAAAAB...")).toBeInTheDocument();
    });

    // Verification status should be "Not Verified" again
    expect(screen.getByText(/Not Verified/i)).toBeInTheDocument();
  });
});
