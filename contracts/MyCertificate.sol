// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/// @title MyCertificate
/// @notice Issues and verifies on-chain certificates. EVM-compatible (works on BOT Chain, Ethereum, etc.)
contract MyCertificate {
    address public owner;

    struct Certificate {
        string recipientName;
        string courseName;
        uint256 issueDate;
        bool isValid;
    }

    mapping(bytes32 => Certificate) public certificates;

    event CertificateIssued(bytes32 indexed certId, string recipientName);
    event CertificateRevoked(bytes32 indexed certId);

    constructor() {
        owner = msg.sender;
    }

    modifier onlyOwner() {
        require(msg.sender == owner, "Not the owner");
        _;
    }

    /// @notice Issue a new certificate. Only the contract owner can call this.
    /// @param certId Unique identifier (e.g. keccak256 hash of recipient + course).
    /// @param recipientName Name of the person receiving the certificate.
    /// @param courseName Name of the course or achievement.
    function issueCertificate(
        bytes32 certId,
        string memory recipientName,
        string memory courseName
    ) public onlyOwner {
        require(!certificates[certId].isValid, "Certificate already exists");

        certificates[certId] = Certificate(
            recipientName,
            courseName,
            block.timestamp,
            true
        );

        emit CertificateIssued(certId, recipientName);
    }

    /// @notice Revoke a previously issued certificate. Only the owner can call this.
    /// @param certId Identifier of the certificate to revoke.
    function revokeCertificate(bytes32 certId) public onlyOwner {
        require(certificates[certId].isValid, "Certificate not found or already revoked");
        certificates[certId].isValid = false;
        emit CertificateRevoked(certId);
    }

    /// @notice Check whether a certificate is currently valid.
    /// @param certId Identifier of the certificate to verify.
    /// @return True if the certificate exists and has not been revoked.
    function verifyCertificate(bytes32 certId) public view returns (bool) {
        return certificates[certId].isValid;
    }
}
