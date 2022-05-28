import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers'
import { expect } from 'chai'
import { BigNumber } from 'ethers'
import { ethers } from 'hardhat'
import {
  UpdatedPepega,
  UpdatedPepega__factory,
  Token,
  Token__factory,
  Marketplace,
  Marketplace__factory,
} from '../typechain'

describe('Marketplace', function () {
  let Token: Token
  let Pepe: UpdatedPepega
  let Market: Marketplace
  let signers: SignerWithAddress[]

  const mintPrice: number = 100
  const auctionTime: number = 100
  const minimalBidAmount: number = 2

  const supply = 500000
  const defaultPrice = 500
  const baseTokenURI: string = 'Google.com'

  const TokenStatus_ACTIVE: number = 1
  const TokenStatus_ONSELL: number = 2
  const TokenStatus_ONAUCTION: number = 3
  const TokenStatus_BURNED: number = 4

  const SaleStatus_ACTIVE: number = 1
  const SaleStatus_SOLD: number = 2
  const SaleStatus_CANCELLED: number = 3

  const AuctionStatus_ACTIVE: number = 1
  const AuctionStatus_SUCCESSFUL_ENDED: number = 2
  const AuctionStatus_UNSUCCESSFULLY_ENDED: number = 3

  beforeEach(async function () {
    signers = await ethers.getSigners()
    Token = await new Token__factory(signers[0]).deploy(
      'TestTokenERC20',
      'TTE',
      500000,
      8
    )
    Market = await new Marketplace__factory(signers[0]).deploy(
      mintPrice,
      auctionTime,
      minimalBidAmount
    )

    Pepe = await new UpdatedPepega__factory(signers[0]).deploy(
      Market.address,
      signers[0].address
    )

    await Market.setERC20Token(Token.address)
    await Market.setPepeAddress(Pepe.address)
    await Token.approve(Market.address, supply)
    await Pepe.setApprovalForAll(Market.address, true)
  })

  describe('Checking getters', () => {
    it('getTotalAmount', async () => {
      expect(await Market.getTotalAmount()).to.eq(0)
    })

    it('getItemsSold is correct', async () => {
      expect(await Market.getItemsSold()).to.eq(0)
    })

    it('getMintPrice', async () => {
      expect(await Market.getMintPrice()).to.eq(mintPrice)
    })

    it('getAuctionMinimalBidAmount', async () => {
      expect(await Market.getAuctionMinimalBidAmount()).to.eq(minimalBidAmount)
    })

    it('getAuctionDuration', async () => {
      expect(await Market.getAuctionDuration()).to.eq(auctionTime)
    })
  })

  describe('Checking setters', () => {
    it('setToken', async () => {
      await Market.setERC20Token(ethers.constants.AddressZero)
      expect(await Market.getERC20Token()).to.eq(ethers.constants.AddressZero)
    })

    it('setPepeAddress', async () => {
      await Market.setPepeAddress(ethers.constants.AddressZero)
      expect(await Market.getPepe()).to.eq(ethers.constants.AddressZero)
    })

    it('upgradeMintPrice', async () => {
      await Market.upgradeMintPrice(1)
      expect(await Market.getMintPrice()).to.eq(1)
    })

    it('setAuctionMinimalBidAmount', async () => {
      await Market.setAuctionMinimalBidAmount(2)
      expect(await Market.getAuctionMinimalBidAmount()).to.eq(2)
    })

    it('setAuctionDuration', async () => {
      await Market.setAuctionDuration(3)
      expect(await Market.getAuctionDuration()).to.eq(3)
    })
  })

  describe('Cheking token status', () => {
    it('getTokenStatus == ACTIVE', async () => {
      await Market.createItem(baseTokenURI, signers[0].address)
      expect(await Market.getTokenStatus(1)).to.eq(TokenStatus_ACTIVE)
    })

    it('getTokenStatus == ONSELL', async () => {
      await Market.createItem(baseTokenURI, signers[0].address)
      await Market.listItem(1, defaultPrice)

      expect(await Market.getTokenStatus(1)).to.eq(TokenStatus_ONSELL)
    })

    it('getTokenStatus == ONAUCTION', async () => {
      await Market.createItem(baseTokenURI, signers[0].address)
      await Market.listItemOnAuction(1, defaultPrice)

      expect(await Market.getTokenStatus(1)).to.eq(TokenStatus_ONAUCTION)
    })
  })

  describe('Checking auction & sell status', () => {
    it('getSaleOrder', async () => {
      await Market.createItem(baseTokenURI, signers[0].address)
      await Market.listItem(1, defaultPrice)

      const item = await Market.getSaleOrder(1)
      expect(item[0]).to.eq(signers[0].address)
      expect(item[1]).to.eq(signers[0].address)
      expect(item[2]).to.eq(ethers.BigNumber.from(`${defaultPrice}`))
      expect(item[3]).to.eq(SaleStatus_ACTIVE)
    })

    it('getAuctionOrder', async () => {
      await Market.createItem(baseTokenURI, signers[0].address)
      await Market.listItemOnAuction(1, defaultPrice)
      const time = (
        await ethers.provider.getBlock(await ethers.provider.getBlockNumber())
      ).timestamp
      const item = await Market.getAuctionOrder(1)

      expect(item[0]).to.eq(defaultPrice)
      expect(item[1]).to.eq(time)
      expect(item[2]).to.eq(ethers.BigNumber.from('0'))
      expect(item[3]).to.eq(ethers.BigNumber.from('0'))
      expect(item[4]).to.eq(signers[0].address)
      expect(item[5]).to.eq(signers[0].address)
      expect(item[6]).to.eq(ethers.constants.AddressZero)
      expect(item[7]).to.eq(AuctionStatus_ACTIVE)
    })
  })

  describe('modifier isActive & AuctionIsActive', () => {
    it('else path', async () => {
      await Market.createItem(baseTokenURI, signers[0].address)
      await Market.listItem(1, defaultPrice)

      await expect(Market.listItem(1, defaultPrice)).to.be.revertedWith(
        'This Pepe has already been put up for sale or auction!'
      )
    })

    it('auctionIsActive', async () => {
      await expect(Market.makeBid(1, 0)).to.be.revertedWith(
        'Auction already ended!'
      )
    })
  })

  describe('auyItem', () => {
    const bigDefaultPrice = ethers.BigNumber.from(`${defaultPrice}`)
    let buyerBalanceBefore: BigNumber
    let buyerPepeBefore: BigNumber

    let buyerBalanceAfter: BigNumber
    let buyerPepeAfter: BigNumber

    beforeEach(async function () {
      await Token.transfer(signers[1].address, bigDefaultPrice)

      await Token.connect(signers[1]).approve(Market.address, bigDefaultPrice)

      buyerBalanceBefore = await Token.balanceOf(signers[1].address)
      buyerPepeBefore = await Pepe.balanceOf(signers[1].address)

      await Market.createItem(baseTokenURI, signers[0].address)
    })

    it('buyer spend tokens & receive the Pepe', async () => {
      await Market.listItem(1, defaultPrice)

      await Market.connect(signers[1]).buyItem(1)

      buyerBalanceAfter = await Token.balanceOf(signers[1].address)
      buyerPepeAfter = await Pepe.balanceOf(signers[1].address)

      expect(buyerBalanceBefore.sub(bigDefaultPrice)).to.eq(buyerBalanceAfter)
      expect(buyerPepeBefore.add('1')).to.eq(buyerPepeAfter)
    })

    it('reverted because sale status not an active ', async () => {
      await expect(Market.connect(signers[1]).buyItem(1)).to.be.revertedWith(
        "The token isn't on sale"
      )
    })

    it('sold items amount incremented ', async () => {
      await Market.listItem(1, defaultPrice)
      const soldItems = await Market.getItemsSold()

      await Market.connect(signers[1]).buyItem(1)
      const soldItemsAfter = await Market.getItemsSold()
      expect(soldItems.add(1)).to.eq(soldItemsAfter)
    })

    it('sold event is correct', async () => {
      await Market.listItem(1, defaultPrice)
      await expect(Market.connect(signers[1]).buyItem(1))
        .to.emit(Market, 'Sold')
        .withArgs(
          1,
          defaultPrice,
          (
            await ethers.provider.getBlock(
              await ethers.provider.getBlockNumber()
            )
          ).timestamp + 1,
          signers[0].address,
          signers[1].address
        )
    })

    it('sale status is sold', async () => {
      await Market.listItem(1, defaultPrice)
      await Market.connect(signers[1]).buyItem(1)
      const order = await Market.getSaleOrder(1)
      expect(order[3]).to.eq(SaleStatus_SOLD)
    })
  })

  describe('cancel', () => {
    it('after canceling Pepe reverted to owner', async () => {
      await Market.createItem(baseTokenURI, signers[0].address)
      await Market.listItem(1, defaultPrice)

      const balanceBefore = await Pepe.balanceOf(signers[0].address)

      await Market.cancel(1)

      const balanceAfter = await Pepe.balanceOf(signers[0].address)
      expect(balanceBefore.add(1)).to.eq(balanceAfter)
    })

    it('order status is CANCELED', async () => {
      await Market.createItem(baseTokenURI, signers[0].address)
      await Market.listItem(1, defaultPrice)

      await Market.cancel(1)

      const order = await Market.getSaleOrder(1)
      expect(order[3]).to.eq(SaleStatus_CANCELLED)
    })

    it('token status is ACTIVE', async () => {
      await Market.createItem(baseTokenURI, signers[0].address)
      await Market.listItem(1, defaultPrice)

      await Market.cancel(1)

      expect(await Market.getTokenStatus(1)).to.eq(TokenStatus_ACTIVE)
    })

    it('emit EventCanceled', async () => {
      await Market.createItem(baseTokenURI, signers[0].address)
      await Market.listItem(1, defaultPrice)

      await expect(await Market.cancel(1))
        .to.emit(Market, 'EventCanceled')
        .withArgs(1, signers[0].address)
    })

    it("requrie isn't a owner || seller", async () => {
      await Market.createItem(baseTokenURI, signers[0].address)
      await Market.listItem(1, defaultPrice)

      await expect(
        Market.connect(signers[1].address).cancel(1)
      ).to.be.revertedWith(
        "You don't have the authority to cancel the sale of this token!"
      )
    })

    it('requrie sale is active', async () => {
      await Market.createItem(baseTokenURI, signers[0].address)
      await Market.listItem(1, defaultPrice)

      await Market.cancel(1)

      await expect(Market.cancel(1)).to.be.revertedWith(
        "The token wasn't on sale"
      )
    })
  })

  describe('makeBid', () => {
    let firstBid: number
    let secondBid: number

    beforeEach(async function () {
      firstBid = 1000
      secondBid = 1500

      await Token.transfer(signers[1].address, firstBid)
      await Token.connect(signers[1]).approve(Market.address, firstBid)

      await Token.transfer(signers[2].address, secondBid)
      await Token.connect(signers[2]).approve(Market.address, secondBid)

      await Market.createItem(baseTokenURI, signers[0].address)
      await Market.listItemOnAuction(1, defaultPrice)
    })

    it('require bid too small', async () => {
      await expect(Market.makeBid(1, 0)).to.be.revertedWith(
        'Your bid less or equal to current bid!'
      )
    })

    it('reverted tokens to previous bidder', async () => {
      await Market.connect(signers[1]).makeBid(1, firstBid)
      const balance = await Token.balanceOf(signers[1].address)

      await Market.connect(signers[2]).makeBid(1, secondBid)
      const balanceAfter = await Token.balanceOf(signers[1].address)

      expect(balance.add(firstBid)).to.eq(balanceAfter)
    })

    it('bid change order', async () => {
      await Market.connect(signers[1]).makeBid(1, firstBid)
      const order = await Market.getAuctionOrder(1)

      expect(order[2]).to.eq(firstBid)
      expect(order[6]).to.eq(signers[1].address)
      expect(order[3]).to.eq(1)
    })

    it('event BidIsMade', async () => {
      await expect(Market.connect(signers[1]).makeBid(1, firstBid))
        .to.emit(Market, 'BidIsMade')
        .withArgs(1, firstBid, 1, signers[1].address)
    })
  })

  describe('finishAuction', () => {
    let firstBid: number
    let secondBid: number
    let thirdBid: number

    beforeEach(async function () {
      firstBid = 1000
      secondBid = 1500
      thirdBid = 2000

      await Token.transfer(signers[1].address, firstBid)
      await Token.connect(signers[1]).approve(Market.address, firstBid)

      await Token.transfer(signers[2].address, secondBid)
      await Token.connect(signers[2]).approve(Market.address, secondBid)

      await Token.transfer(signers[3].address, thirdBid)
      await Token.connect(signers[3]).approve(Market.address, thirdBid)

      await Market.createItem(baseTokenURI, signers[0].address)
      await Market.listItemOnAuction(1, defaultPrice)
    })

    it('require auction duration', async () => {
      await expect(Market.finishAuction(1)).to.be.revertedWith(
        'Auction duration not complited!'
      )
    })
  })

  describe('finishAuction ended', () => {
    let firstBid: number
    let secondBid: number
    let thirdBid: number

    beforeEach(async function () {
      firstBid = 1000
      secondBid = 1500
      thirdBid = 2000

      await Token.transfer(signers[1].address, firstBid)
      await Token.connect(signers[1]).approve(Market.address, firstBid)

      await Token.transfer(signers[2].address, secondBid)
      await Token.connect(signers[2]).approve(Market.address, secondBid)

      await Token.transfer(signers[3].address, thirdBid)
      await Token.connect(signers[3]).approve(Market.address, thirdBid)

      await Market.createItem(baseTokenURI, signers[0].address)
      await Market.listItemOnAuction(1, defaultPrice)

      await ethers.provider.send('evm_increaseTime', [1000])

      await Market.connect(signers[1]).makeBid(1, firstBid)
      await Market.connect(signers[2]).makeBid(1, secondBid)
      await Market.connect(signers[3]).makeBid(1, thirdBid)
    })

    it('order status is SUCCESSFUL_ENDED', async () => {
      await Market.finishAuction(1)
      const order = await Market.getAuctionOrder(1)

      expect(order[7]).to.eq(AuctionStatus_SUCCESSFUL_ENDED)
    })

    it('token status is ACTIVE after auction ', async () => {
      await Market.finishAuction(1)
      const status = await Market.getTokenStatus(1)

      expect(status).to.eq(TokenStatus_ACTIVE)
    })

    it('items sold increased adter auction', async () => {
      const itemsSoldBefore = await Market.getItemsSold()
      await Market.finishAuction(1)
      const itemsSoldAfter = await Market.getItemsSold()

      expect(itemsSoldBefore.add(1)).to.eq(itemsSoldAfter)
    })

    it('emit PositiveEndAuction', async () => {
      await expect(Market.finishAuction(1))
        .to.emit(Market, 'PositiveEndAuction')
        .withArgs(
          1,
          thirdBid,
          3,
          (
            await ethers.provider.getBlock(
              await ethers.provider.getBlockNumber()
            )
          ).timestamp + 1,
          signers[0].address,
          signers[3].address
        )
    })
  })

  describe('finish auction', () => {
    const bid = 1000

    it('error: reverted', async () => {
      await Token.transfer(signers[1].address, bid)
      await Token.connect(signers[1]).approve(Market.address, bid)

      await Market.createItem(baseTokenURI, signers[0].address)
      await Market.listItemOnAuction(1, defaultPrice)

      await ethers.provider.send('evm_increaseTime', [1000])

      await Market.connect(signers[1]).makeBid(1, bid)

      const balanceBefore = await Token.balanceOf(signers[1].address)

      await Market.finishAuction(1)

      const balanceAfter = await Token.balanceOf(signers[1].address)

      expect(balanceBefore).to.eq(balanceAfter)
    })
  })

  describe('Burn', () => {
    it('require onlyOwner', async () => {
      await Market.createItem(baseTokenURI, signers[0].address)

      await expect(Market.connect(signers[1]).burn(1)).to.be.revertedWith(
        'Only owner can burn a token!'
      )
    })

    it('total amount decremented', async () => {
      await Market.createItem(baseTokenURI, signers[0].address)
      const amount = await Market.getTotalAmount()
      await Market.burn(1)
      const amountAfter = await Market.getTotalAmount()

      expect(amount.sub(1)).to.eq(amountAfter)
    })

    it('burn set token status', async () => {
      await Market.createItem(baseTokenURI, signers[0].address)
      await Market.burn(1)

      expect(await Market.getTokenStatus(1)).to.eq(TokenStatus_BURNED)
    })

    it('burn emit Burned', async () => {
      await Market.createItem(baseTokenURI, signers[0].address)
      expect(Market.burn(1))
        .to.emit(Market, 'Burned')
        .withArgs(
          1,
          signers[0].address,
          (
            await ethers.provider.getBlock(
              await ethers.provider.getBlockNumber()
            )
          ).timestamp
        )
    })
  })

  describe('withdrawTokens', () => {
    it('tokens received', async () => {
      await Market.createItem(baseTokenURI, signers[0].address)
      const balanceBefore = await Token.balanceOf(signers[0].address)
      await Market.withdrawTokens(signers[0].address, mintPrice)
      const balanceAfter = await Token.balanceOf(signers[0].address)

      expect(balanceBefore.add(mintPrice)).to.eq(balanceAfter)
    })
  })
})
