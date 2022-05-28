import { ethers, run } from 'hardhat'
import { contractAddress, nftAddress } from '../config'

async function main() {
  const mintPrice = ethers.BigNumber.from('500000000000000000000')
  const minAuctionDuration = 3 * 24 * 3600
  const minBidAmount = 2
  const [signer] = await ethers.getSigners()

  await run(`verify:verify`, {
    address: contractAddress,
    contract: 'contracts/Marketplace.sol:Marketplace',
    constructorArguments: [mintPrice, minAuctionDuration, minBidAmount],
  })

  await run(`verify:verify`, {
    address: nftAddress,
    contract: 'contracts/UpdatedPepega.sol:UpdatedPepega',
    constructorArguments: [contractAddress, signer.address],
  })

  console.log(`
    "Marketplace" verified: ${contractAddress},
    "Pepega" verified address: ${nftAddress}
  `)
}

main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
