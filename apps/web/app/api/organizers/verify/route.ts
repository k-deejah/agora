import { NextRequest, NextResponse } from "next/server";
import {
  Account,
  Contract,
  Networks,
  TransactionBuilder,
  nativeToScVal,
} from "@stellar/stellar-sdk";

export async function POST(request: NextRequest) {
  try {
    const { action, organizerAddress, amount } = await request.json();

    if (!organizerAddress) {
      return NextResponse.json({ error: "Organizer address is required" }, { status: 400 });
    }

    // Fallback contract address if not configured
    const contractAddress =
      process.env.STELLAR_CONTRACT_ADDRESS ||
      "CDK5X3J5I5Y5X3J5I5Y5X3J5I5Y5X3J5I5Y5X3J5I5Y5X3J5I5Y5X3J5";
    const networkPassphrase =
      process.env.STELLAR_NETWORK_PASSPHRASE || Networks.TESTNET;

    // Use a mock sequence number 0 for generating the unsigned XDR transaction envelope
    const sourceAccount = new Account(organizerAddress, "0");
    const contract = new Contract(contractAddress);

    let operation;
    if (action === "stake") {
      const stakeAmount = Number(amount);
      if (isNaN(stakeAmount) || stakeAmount <= 0) {
        return NextResponse.json({ error: "Invalid stake amount" }, { status: 400 });
      }
      operation = contract.call(
        "stake_collateral",
        nativeToScVal(organizerAddress, { type: "address" }),
        nativeToScVal(stakeAmount, { type: "i128" })
      );
    } else if (action === "unstake") {
      operation = contract.call(
        "unstake_collateral",
        nativeToScVal(organizerAddress, { type: "address" })
      );
    } else {
      return NextResponse.json({ error: "Invalid action" }, { status: 400 });
    }

    const tx = new TransactionBuilder(sourceAccount, {
      fee: "100",
      networkPassphrase,
    })
      .addOperation(operation)
      .setTimeout(30)
      .build();

    const xdr = tx.toXDR();
    return NextResponse.json({ xdr, contractAddress });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Failed to generate XDR transaction payload" },
      { status: 500 }
    );
  }
}
