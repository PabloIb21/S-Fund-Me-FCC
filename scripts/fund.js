const { ethers, getNamedAccounts } = require('hardhat');

async function main() {
  const { deployer } = await getNamedAccounts();
  const fundMe = await ethers.getContract('FundMe', deployer);
  console.log('Funding Contract...');
  const txRes = await fundMe.fund({ value: ethers.utils.parseEther('0.1') });
  await txRes.wait(1);
  console.log('Funded!');
}

main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error);
    process.exit(1);
  });