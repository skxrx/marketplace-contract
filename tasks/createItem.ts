import { task } from 'hardhat/config'
import { contractAddress } from '../config'

task('createItem', 'Create ERC-721 token on markeplace')
  .addParam('uri', 'Token URI')
  .addParam('owner', 'On what address to create a token ?')
  .setAction(async function (taskArgs, hre) {
    const marketplace = await hre.ethers.getContractAt(
      'Marketplace',
      contractAddress
    )
    await marketplace.createItem(taskArgs.uri, taskArgs.owner)
  })
