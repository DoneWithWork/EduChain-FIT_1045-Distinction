import { getFullnodeUrl, SuiClient } from '@mysten/sui/client';
import { getFaucetHost, requestSuiFromFaucetV2 } from '@mysten/sui/faucet';
import { MIST_PER_SUI } from '@mysten/sui/utils';
import { Ed25519Keypair } from '@mysten/sui/keypairs/ed25519';
import dotenv from "dotenv"
dotenv.config();

const SUI_ADDRESS = process.env.SUI_ADDRESS!

export const suiClient = new SuiClient({ url: getFullnodeUrl('testnet') });

export async function newPrivateKey() {
    const keyPair = new Ed25519Keypair();
    return keyPair.getSecretKey();
}



