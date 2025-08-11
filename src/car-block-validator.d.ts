// The original package does not have a type definition file, so we create a minimal one here.

declare module '@web3-storage/car-block-validator' {
  export function validateBlock(block: Block): Promise<void>;
}

