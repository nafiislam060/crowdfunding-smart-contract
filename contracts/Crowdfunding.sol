// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

contract Crowdfunding {

    address public owner;
    uint public campaignCount;

    constructor() {
        owner = msg.sender;
    }

    struct Campaign {
        address creator;
        string title;
        string description;
        uint goalAmount;
        uint deadline;
        uint amountRaised;
        bool claimed;
    }

    mapping(uint => Campaign) public campaigns;
    mapping(uint => mapping(address => uint)) public contributions;

    // EVENTS
    event CampaignCreated(uint campaignId, address creator, uint goal, uint deadline);
    event ContributionReceived(uint campaignId, address backer, uint amount);
    event FundsClaimed(uint campaignId, address creator, uint amount);
    event RefundIssued(uint campaignId, address backer, uint amount);

    // MODIFIER
    modifier onlyCreator(uint _id) {
        require(msg.sender == campaigns[_id].creator, "Not campaign creator");
        _;
    }

    // CREATE CAMPAIGN
    function createCampaign(
        string memory _title,
        string memory _description,
        uint _goalAmount,
        uint _durationInDays
    ) external {

        require(_goalAmount > 0, "Goal must be > 0");
        require(_durationInDays >= 1 && _durationInDays <= 60, "Duration 1-60 days");

        campaignCount++;

        campaigns[campaignCount] = Campaign({
            creator: msg.sender,
            title: _title,
            description: _description,
            goalAmount: _goalAmount,
            deadline: block.timestamp + (_durationInDays * 1 days),
            amountRaised: 0,
            claimed: false
        });

        emit CampaignCreated(
            campaignCount,
            msg.sender,
            _goalAmount,
            campaigns[campaignCount].deadline
        );
    }

    // CONTRIBUTE
    function contribute(uint _id) external payable {
         require(_id > 0 && _id <= campaignCount, "Invalid campaign");
        Campaign storage c = campaigns[_id];

        require(c.creator != address(0), "Campaign not exist");
        require(block.timestamp < c.deadline, "Campaign ended");
        require(msg.value > 0, "Send ETH");
        
        c.amountRaised += msg.value;
        contributions[_id][msg.sender] += msg.value;

        emit ContributionReceived(_id, msg.sender, msg.value);
    }

    // CLAIM FUNDS
    function claimFunds(uint _id) external onlyCreator(_id) {
        require(_id > 0 && _id <= campaignCount, "Invalid campaign");
        Campaign storage c = campaigns[_id];

        require(c.creator != address(0), "Campaign not exist");
        require(block.timestamp >= c.deadline, "Not ended");
        require(c.amountRaised >= c.goalAmount, "Goal not met");
        require(!c.claimed, "Already claimed");

        c.claimed = true;

        uint amount = c.amountRaised;

        (bool success, ) = payable(c.creator).call{value: amount}("");
        require(success, "Transfer failed");

        emit FundsClaimed(_id, c.creator, amount);
    }

    // REFUND
    function refund(uint _id) external {
        require(_id > 0 && _id <= campaignCount, "Invalid campaign");
        Campaign storage c = campaigns[_id];

        require(c.creator != address(0), "Campaign not exist");
        require(block.timestamp >= c.deadline, "Not ended");
        require(c.amountRaised < c.goalAmount, "Goal was met");

        uint contributed = contributions[_id][msg.sender];
        require(contributed > 0, "No contribution");

        contributions[_id][msg.sender] = 0;

        (bool success, ) = payable(msg.sender).call{value: contributed}("");
        require(success, "Refund failed");

        emit RefundIssued(_id, msg.sender, contributed);
    }

    // GET CAMPAIGN
    function getCampaign(uint _id) external view returns (
        address,
        string memory,
        string memory,
        uint,
        uint,
        uint,
        bool
    ) {
        Campaign memory c = campaigns[_id];
        require(c.creator != address(0), "Campaign not exist");
        return (
            c.creator,
            c.title,
            c.description,
            c.goalAmount,
            c.deadline,
            c.amountRaised,
            c.claimed
        );
    }
}