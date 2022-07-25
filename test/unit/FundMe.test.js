const { deployments, ethers, getNamedAccounts } = require('hardhat');
const { developmentChains } = require('../../helper-hardhat-config');
const { assert, expect } = require('chai');

!developmentChains.includes(network.name) 
  ? describe.skip
  : describe('FundMe', async () => {
      let fundMe;
      let deployer;
      let mockV3Aggregator;
      const sendValue = ethers.utils.parseEther('1'); // 1 ETH
      beforeEach(async () => {
        deployer = (await getNamedAccounts()).deployer;
        await deployments.fixture(["all"]);
        fundMe = await ethers.getContract('FundMe', deployer);
        mockV3Aggregator = await ethers.getContract('MockV3Aggregator', deployer);
      });

      describe('constructor', async () => {
        it('sets the aggregator addresses correctly', async () => {
          const res = await fundMe.priceFeed();
          assert.equal(res, mockV3Aggregator.address);
        });
      });

      describe('fund', async () => {
        it('fails if you dont send enough ETH', async () => {
          await expect(fundMe.fund()).to.be.revertedWith('You need to spend more ETH!');
        });
        it('updated the amount funded data structure', async () => {
          await fundMe.fund({ value: sendValue });
          const res = await fundMe.getAddressToAmountFunded(
            deployer
          );
          assert.equal(res.toString(), sendValue.toString());
        });
        it('adds funder to array of funders', async () => {
          await fundMe.fund({ value: sendValue });
          const funder = await fundMe.getFunder(0);
          assert.equal(funder, deployer);
        });
      });

      describe('withdraw', async () => {
        beforeEach(async () => {
          await fundMe.fund({ value: sendValue });
        });
        it('withdraw ETH from a single founder', async () => {
          // Arrange
          const startingFundMeBalance = await fundMe.provider.getBalance(fundMe.address);
          const startingDeployerBalance = await fundMe.provider.getBalance(deployer);

          // Act
          const txResponse = await fundMe.withdraw();
          const txReceipt = await txResponse.wait(1);
          const { gasUsed, effectiveGasPrice } = txReceipt;
          const gasCost = gasUsed.mul(effectiveGasPrice);

          const endingFundMeBalance = await fundMe.provider.getBalance(fundMe.address);
          const endingDeployerBalance = await fundMe.provider.getBalance(deployer);

          // Assert
          assert.equal(endingFundMeBalance, 0);
          assert.equal(startingFundMeBalance.add(startingDeployerBalance).toString(), endingDeployerBalance.add(gasCost).toString());
        });
        it('allows us to withdraw with multiple funders', async () => {
          // Arrange
          const accounts = await ethers.getSigners();
          for (let i = 1; i < 6; i++) {
            const fundMeConnectedContract = await fundMe.connect(accounts[i]);
            await fundMeConnectedContract.fund({ value: sendValue });
          }
          const startingFundMeBalance = await fundMe.provider.getBalance(fundMe.address);
          const startingDeployerBalance = await fundMe.provider.getBalance(deployer);

          // Act
          const txResponse = await fundMe.withdraw();
          const txReceipt = await txResponse.wait(1);
          const { gasUsed, effectiveGasPrice } = txReceipt;
          const gasCost = gasUsed.mul(effectiveGasPrice);

          const endingFundMeBalance = await fundMe.provider.getBalance(fundMe.address);
          const endingDeployerBalance = await fundMe.provider.getBalance(deployer);

          // Assert
          assert.equal(endingFundMeBalance, 0);
          assert.equal(startingFundMeBalance.add(startingDeployerBalance).toString(), endingDeployerBalance.add(gasCost).toString());

          // Make sure that the funders are reset properly
          await expect(fundMe.getFunder(0)).to.be.reverted;

          for(i = 1; i < 6; i++) {
            assert.equal(await fundMe.getAddressToAmountFunded(accounts[i].address), 0);
          }
        });
        it('only allows the owner to withdraw', async () => {
          const accounts = await ethers.getSigners();
          const attacker = accounts[1];
          const attackerConnectedContract = await fundMe.connect(attacker);
          await expect(attackerConnectedContract.withdraw()).to.be.reverted;
        });
      });
      describe('cheaperWithdraw', () => {
        beforeEach(async () => {
          await fundMe.fund({ value: sendValue });
        });
        it('cheaperWithdraw ETH from a single founder', async () => {
          // Arrange
          const startingFundMeBalance = await fundMe.provider.getBalance(fundMe.address);
          const startingDeployerBalance = await fundMe.provider.getBalance(deployer);

          // Act
          const txResponse = await fundMe.cheaperWithdraw();
          const txReceipt = await txResponse.wait(1);
          const { gasUsed, effectiveGasPrice } = txReceipt;
          const gasCost = gasUsed.mul(effectiveGasPrice);

          const endingFundMeBalance = await fundMe.provider.getBalance(fundMe.address);
          const endingDeployerBalance = await fundMe.provider.getBalance(deployer);

          // Assert
          assert.equal(endingFundMeBalance, 0);
          assert.equal(startingFundMeBalance.add(startingDeployerBalance).toString(), endingDeployerBalance.add(gasCost).toString());
        });
        it('allows us to cheaperWithdraw with multiple funders', async () => {
          // Arrange
          const accounts = await ethers.getSigners();
          for (let i = 1; i < 6; i++) {
            const fundMeConnectedContract = await fundMe.connect(accounts[i]);
            await fundMeConnectedContract.fund({ value: sendValue });
          }
          const startingFundMeBalance = await fundMe.provider.getBalance(fundMe.address);
          const startingDeployerBalance = await fundMe.provider.getBalance(deployer);

          // Act
          const txResponse = await fundMe.cheaperWithdraw();
          const txReceipt = await txResponse.wait(1);
          const { gasUsed, effectiveGasPrice } = txReceipt;
          const gasCost = gasUsed.mul(effectiveGasPrice);

          const endingFundMeBalance = await fundMe.provider.getBalance(fundMe.address);
          const endingDeployerBalance = await fundMe.provider.getBalance(deployer);

          // Assert
          assert.equal(endingFundMeBalance, 0);
          assert.equal(startingFundMeBalance.add(startingDeployerBalance).toString(), endingDeployerBalance.add(gasCost).toString());

          // Make sure that the funders are reset properly
          await expect(fundMe.getFunder(0)).to.be.reverted;

          for(i = 1; i < 6; i++) {
            assert.equal(await fundMe.getAddressToAmountFunded(accounts[i].address), 0);
          }
        });
      });
    });