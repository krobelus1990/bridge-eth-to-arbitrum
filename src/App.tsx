import './App.css';
import bg from './bridge-assets-ethereum-arbitrum.png'
import "bootstrap/dist/css/bootstrap.min.css";
import "@rainbow-me/rainbowkit/styles.css";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import { getL2Network, EthBridger, EthDepositStatus } from '@arbitrum/sdk'
import { useState, useEffect } from 'react';
import {
  RainbowKitProvider,
  darkTheme,
  connectorsForWallets,
} from "@rainbow-me/rainbowkit";
import {
  rainbowWallet,
  walletConnectWallet,
  trustWallet,
  okxWallet,
  ledgerWallet,
  metaMaskWallet,
} from "@rainbow-me/rainbowkit/wallets";
import { configureChains, createConfig, sepolia, WagmiConfig, } from "wagmi";
import {
  mainnet,
  optimism,
  arbitrum,
  arbitrumSepolia,
} from "wagmi/chains";
import { alchemyProvider } from "wagmi/providers/alchemy";
import { publicProvider } from "wagmi/providers/public";
import { ALCHEMY_API_KEY, PROJECT_ID, DEVNET_PRIVKEY, L2RPC, L1RPC } from "./utils/env";
import { utils, providers, Wallet } from 'ethers';
const { parseEther } = utils

const { chains, publicClient } = configureChains(
  [mainnet, optimism, arbitrum, sepolia, arbitrumSepolia],
  [alchemyProvider({ apiKey: ALCHEMY_API_KEY }), publicProvider()]
);

const projectId = PROJECT_ID;
const connectors = connectorsForWallets([
  {
    groupName: "Recommended",
    wallets: [
      metaMaskWallet({ projectId, chains }), // Metamask
      ...(projectId ? [walletConnectWallet({ projectId, chains })] : []),
      ...(projectId ? [trustWallet({ projectId, chains })] : []),
    ],
  },
  {
    groupName: "Other",
    wallets: [
      ...(projectId ? [rainbowWallet({ projectId, chains })] : []),
      ...(projectId ? [okxWallet({ projectId, chains })] : []),
      ...(projectId ? [ledgerWallet({ projectId, chains })] : []),
    ],
  },
]);

const wagmiConfig = createConfig({
  autoConnect: true,
  connectors,
  publicClient,
});

function App() {
  const [amount, setAmount] = useState('0');
  const [l1Balance, setL1Balance] = useState('No balance');
  const [l2Balance, setL2Balance] = useState('No balance');

  const ethToL2DepositAmount = parseEther(amount)
  const l1Provider = new providers.JsonRpcProvider(L1RPC)
  const l2Provider = new providers.JsonRpcProvider(L2RPC)
  const walletPrivateKey = DEVNET_PRIVKEY
  const l1Wallet = new Wallet(walletPrivateKey, l1Provider)
  const l2Wallet = new Wallet(walletPrivateKey, l2Provider)

  useEffect(() => {
    const fetchData = async () => {

      const l1WalletInitialEthBalance = await l1Wallet.getBalance();
      const l2WalletInitialEthBalance = await l2Wallet.getBalance();
    
      setL1Balance(((parseFloat(l1WalletInitialEthBalance.toString()))/(10^19)).toString());
      setL2Balance(l2WalletInitialEthBalance.toString());
    };

    fetchData();
  });

  const Deposit = async () => {
    // addDefaultLocalNetwork()
    const l2Network = await getL2Network(l2Provider)
    const ethBridger = new EthBridger(l2Network)



    const depositTx = await ethBridger.deposit({
      amount: ethToL2DepositAmount,
      l1Signer: l1Wallet,
    })


    const depositRec = await depositTx.wait()
    console.warn('deposit L1 receipt is:', depositRec.transactionHash)

    console.warn('Now we wait for L2 side of the transaction to be executed ⏳')
    const l2Result = await depositRec.waitForL2(l2Provider)

    l2Result.complete
      ? console.log(
        `L2 message successful: status: ${EthDepositStatus[await l2Result.message.status()]
        }`
      )
      : console.log(
        `L2 message failed: status ${EthDepositStatus[await l2Result.message.status()]
        }`
      )

    // const l2WalletUpdatedEthBalance = await l2Wallet.getBalance()
    // console.log(
    //   `your L2 ETH balance is updated from ${l2WalletInitialEthBalance.toString()} to ${l2WalletUpdatedEthBalance.toString()}`
    // )
  }

  return (
    <>
      <WagmiConfig config={wagmiConfig}>
        <RainbowKitProvider chains={chains} coolMode theme={darkTheme()}>
          <div className=" w-full">
            <img className=' w-full h-screen fixed top-0 left-0' src={bg} alt="" />
            <div className=' mt-[200px] z-10 relative'>
              <ConnectButton.Custom>
                {({
                  account,
                  chain,
                  openAccountModal,
                  openChainModal,
                  openConnectModal,
                  authenticationStatus,
                  mounted,
                }) => {
                  const ready = mounted && authenticationStatus !== 'loading';
                  const connected =
                    ready &&
                    account &&
                    chain &&
                    (!authenticationStatus ||
                      authenticationStatus === 'authenticated');

                  return (
                    <div
                      {...(!ready && {
                        'aria-hidden': true,
                        'style': {
                          opacity: 0,
                          pointerEvents: 'none',
                          userSelect: 'none',
                        },
                      })}
                    >
                      {(() => {
                        if (!connected) {
                          return (
                            <div className=" flex gap-[4px] justify-center items-center w-full">
                              <button onClick={openConnectModal} style={{ fontFamily: 'Might', width: '200px', fontSize: '18px', transition: '0.1s' }} className="relative rounded-[0.5rem] cursor-pointer group font-medium no-underline flex p-2 text-white items-center justify-center content-center focus:outline-none">
                                <span className="absolute top-0 left-0 w-full h-full rounded opacity-50 filter blur-md bg-gradient-to-br from-[#256fc4] to-[#256fc4]"  ></span>
                                <span className="h-full w-full inset-0 absolute mt-0.5 ml-0.5 bg-gradient-to-br filter group-active:opacity-0 rounded opacity-50 from-[#256fc4] to-[#256fc4] "></span>
                                <span className="absolute inset-0 w-full h-full transition-all duration-200 ease-out rounded shadow-xl bg-gradient-to-br filter group-active:opacity-0 group-hover:blur-md from-[#256fc4] to-[#256fc4] "></span>
                                <span className="absolute inset-0 w-full h-full transition duration-200 ease-out rounded bg-gradient-to-br to-[#256fc4] from-[#256fc4] "></span>
                                <span className="relative">Connect wallet</span>
                              </button>
                            </div>
                          );
                        }

                        if (chain.unsupported) {
                          return (
                            <button onClick={openChainModal} style={{ boxShadow: 'rgb(0 0 0 / 98%) 3px 3px 3px 3px' }}>
                              Wrong network
                            </button>
                          );
                        }
                        return (
                          <div className=" flex gap-[15px] justify-center items-center">
                            <div
                              className="align-middle select-none font-sans font-bold text-center uppercase transition-all disabled:opacity-50 disabled:shadow-none disabled:pointer-events-none text-xs py-2 px-3 rounded-lg bg-gradient-to-tr from-[#ffffff] dark:from-[rgb(27,27,27)] dark:to-[rgb(27,27,27)] cursor-pointer to-[#dedede] text-[rgb(18,18,18)] dark:text-white shadow-md shadow-gray-900/10 hover:shadow-lg hover:shadow-gray-900/20 active:opacity-[0.85] flex items-center gap-1"
                              onClick={openChainModal} style={{ fontFamily: 'Smack' }}>
                              <span>
                                {chain.hasIcon && (
                                  <div
                                    style={{
                                      background: chain.iconBackground,
                                      borderRadius: 999,
                                      overflow: 'hidden',
                                      marginRight: 4,
                                    }}
                                  >
                                    {chain.iconUrl && (
                                      <img
                                        alt={chain.name ?? 'Chain icon'}
                                        src={chain.iconUrl}
                                        className=' w-[25px] h-[25px]'
                                      />
                                    )}
                                  </div>
                                )}
                              </span>
                              <span className=" text-[15px] first-letter:uppercase lowercase text-[rgb(18,18,18)] dark:text-white">
                                {chain.name}
                              </span>
                              <svg className="h-5 w-5 text-[rgb(18,18,18)] dark:text-white" width="24" height="24" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor" fill="none" strokeLinecap="round" strokeLinejoin="round">  <path stroke="none" d="M0 0h24v24H0z" />  <polyline points="6 9 12 15 18 9" /></svg>
                            </div>
                            <div
                              className="align-middle select-none cursor-pointer font-sans font-bold text-center uppercase transition-all disabled:opacity-50 disabled:shadow-none disabled:pointer-events-none text-xs py-[10px] px-3 rounded-lg bg-gradient-to-tr from-[#ffffff] dark:from-[rgb(27,27,27)] dark:to-[rgb(27,27,27)] to-[#dedede] text-[rgb(18,18,18)] dark:text-white shadow-md shadow-gray-900/10 hover:shadow-lg hover:shadow-gray-900/20 active:opacity-[0.85] flex items-center gap-2"
                              onClick={openAccountModal} style={{ fontFamily: 'Smack' }}>
                              <span className=" text-[15px] uppercase text-[rgb(18,18,18)] dark:text-white">
                                {account.displayBalance
                                  ? account.displayBalance
                                  : ''}
                              </span>
                              <span className=" text-[15px] first-letter:uppercase lowercase text-[rgb(18,18,18)] dark:text-white">
                                {account.displayName}
                              </span>
                              <svg className="h-5 w-5 text-[rgb(18,18,18)] dark:text-white" width="24" height="24" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor" fill="none" strokeLinecap="round" strokeLinejoin="round">  <path stroke="none" d="M0 0h24v24H0z" />  <polyline points="6 9 12 15 18 9" /></svg>
                            </div>
                          </div>
                        );
                      })()}
                    </div>
                  );
                }}
              </ConnectButton.Custom>
            </div>
            <div className='flex flex-col gap-[50px] justify-center items-center mt-[300px] w-full z-10 relative'>
              {/* <div className=' flex justify-center items-center gap-[100px]'>
                <span className=' text-[20px] font-bold text-white'>{l1Balance}</span>
                <span className=' text-[20px] font-bold text-white'>{l2Balance}</span>
              </div> */}
              <div className='flex items-center justify-center gap-[50px]'>
                <label className="block w-full text-[17px] font-medium mb-2 text-white text-center">Deposit Amount</label>
                <input type="text" value={amount} onChange={({ target: { value } }) => {
                  if (!isNaN(parseFloat(value))) {
                    setAmount(value);
                  } else setAmount('0');
                }
                } className="py-2 px-3 block w-[350px] border-[1px] font-thin border-solid outline-none border-gray-300 rounded-lg text-[17px] focus:border-gray-500 dark:focus:border-[#4f4f4f] disabled:opacity-50 disabled:pointer-events-none bg-none dark:bg-[rgb(18,18,18)] dark:border-[#303030] dark:text-gray-200 dark:placeholder:text-[#a7a7a7]" placeholder="Your website.io" />
              </div>
              <button onClick={Deposit} style={{ fontFamily: 'Might', width: '200px', fontSize: '18px', transition: '0.1s' }} className="relative rounded-[0.5rem] cursor-pointer group font-medium no-underline flex p-2 text-white items-center justify-center content-center focus:outline-none">
                <span className="absolute top-0 left-0 w-full h-full rounded opacity-50 filter blur-md bg-gradient-to-br from-[#256fc4] to-[#256fc4]"  ></span>
                <span className="h-full w-full inset-0 absolute mt-0.5 ml-0.5 bg-gradient-to-br filter group-active:opacity-0 rounded opacity-50 from-[#256fc4] to-[#256fc4] "></span>
                <span className="absolute inset-0 w-full h-full transition-all duration-200 ease-out rounded shadow-xl bg-gradient-to-br filter group-active:opacity-0 group-hover:blur-md from-[#256fc4] to-[#256fc4] "></span>
                <span className="absolute inset-0 w-full h-full transition duration-200 ease-out rounded bg-gradient-to-br to-[#256fc4] from-[#256fc4] "></span>
                <span className="relative">Deposit ETH</span>
              </button>
            </div>
          </div>
        </RainbowKitProvider>
      </WagmiConfig >
    </>
  );
}

export default App;
