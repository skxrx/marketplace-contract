//SPDX-License-Identifier: MIT
pragma solidity ^0.8.14;

import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";

contract UpdatedPepega is ERC721, ERC721URIStorage, AccessControl {
    bytes32 private constant MARKETPLACE_ROLE = keccak256("MARKETPLACE_ROLE");
    bytes32 private constant ADMIN_ROLE =
        keccak256("ADMIN_ROLE");

    address private _marketplaceAddress;
    event MarketplaceAddressChanged(address oldAddress, address newAddress); 

    constructor(address marketplaceAddress, address adminAddress)
        ERC721("RedSea", "RS")
    {
        _setupRole(MARKETPLACE_ROLE, marketplaceAddress);
        _setupRole(ADMIN_ROLE, adminAddress);

        _marketplaceAddress = marketplaceAddress;
    }

    function mint(
        address to,
        uint256 tokenId,
        string memory uri
    ) external onlyRole(MARKETPLACE_ROLE) {
        _safeMint(to, tokenId);
        _setTokenURI(tokenId, uri);
    }

    function burn(uint256 tokenId) external onlyRole(MARKETPLACE_ROLE) {
        _burn(tokenId);
    }

    function tokenURI(uint256 tokenId)
        public
        view
        override(ERC721, ERC721URIStorage)
        returns (string memory)
    {
        return super.tokenURI(tokenId);
    }

    function setMarketplaceAddress(address newMarketplaceAddress)
        external
        onlyRole(ADMIN_ROLE)
    {
        emit MarketplaceAddressChanged(
            _marketplaceAddress,
            newMarketplaceAddress
        );
        _marketplaceAddress = newMarketplaceAddress;
    }

    function supportsInterface(bytes4 interfaceId)
        public
        view
        virtual
        override(ERC721, AccessControl)
        returns (bool)
    {
        return super.supportsInterface(interfaceId);
    }

    function _burn(uint256 tokenId)
        internal
        override(ERC721, ERC721URIStorage)
    {
        super._burn(tokenId);
    }
}
