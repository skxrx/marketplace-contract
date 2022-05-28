import { ethers, run } from 'hardhat'

async function main() {
  const mintPrice = ethers.BigNumber.from('500000000000000000000')
  const minAuctionDuration = 3 * 24 * 3600
  const minBidAmount = 2
  const [signer] = await ethers.getSigners()

  const Marketplace = await ethers.getContractFactory('Marketplace')
  const Pepega = await ethers.getContractFactory('UpdatedPepega')

  const market = await Marketplace.deploy(
    mintPrice,
    minAuctionDuration,
    minBidAmount
  )
  await market.deployed()

  const pepe = await Pepega.deploy(market.address, signer.address)
  await pepe.deployed()

  console.log(`
    "Marketplace" contract address: ${market.address}
    "Pepega" contract address: ${pepe.address}
  `)
}

main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
