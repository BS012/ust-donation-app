import {useEffect, useState} from "react";
import {FaHeart} from 'react-icons/fa'
import {MdWarning} from 'react-icons/md'
import {RiInformationFill} from 'react-icons/ri'
import Wallet from '../assets/wallet.png'
import {truncate} from "../shared/Utils";
import { useWallet, useConnectedWallet, useLCDClient, WalletStatus} from "@terra-money/wallet-provider";
import { Fee, MsgSend } from '@terra-money/terra.js';

function Donation() {

    const {
        CreateTxFailed,
        Timeout,
        TxFailed,
        TxResult,
        TxUnspecifiedError,
        UserDenied,
        status,
        availableConnectTypes,
        connect,
        disconnect
    } = useWallet();
    const lcd = useLCDClient();
    const connectedWallet = useConnectedWallet();

    const [amount, setAmount] = useState(0);
    const [refundType, setRefundType] = useState("0");
    const [currency, setCurrency] = useState({name:"Luna", denom: "uluna"});
    const [txResult, setTxResult] = useState({status: 0, message: ""});
    const [amountAvailable, setAmountAvailable] = useState(0);
    const [wrongAmount, setWrongAmount] = useState(false);

    const CONTRACT_ADDRESS = 'terra12hnhh5vtyg5juqnzm43970nh4fw42pt27nw9g9';
    const currencies = [
        {
            name: "USDT",
            denom: "uusdt",
        },
        {
            name: "USDC",
            denom: "uusdc",
        },
        {
            name: "Luna",
            denom: "uluna",
        }
    ];

    const refundAlgo = [
        {
            title: "Distribute to 10% smallest holders only",
            value: "0",
            description: "Insert description here"
        },
        {
            title: "Distribute to all wallets",
            value: "1",
            description: "Insert description here"
        },
        {
            title: "Distribute to all wallets with a 50k cap",
            value: "2",
            description: "Insert description here"
        },
        {
            title: "Distribute to all wallets with a 200k cap",
            value: "3",
            description: "Insert description here"
        }
    ];

    const updateAmount = (e) => {
        const val = e.target.value;
        if (e.target.validity.valid)
            val === "" ? setAmount(0) : setAmount(val);

        if(val > amountAvailable)
            setWrongAmount(true)
        else
            setWrongAmount(false)
    }

    const handleSelect = (e) => {
        currencies.map((curr) => {
            if(curr.name === e.target.value){
                setCurrency({ name: curr.name, denom: curr.denom})
                if(status === "WALLET_CONNECTED"){
                    setAmount(0)
                    lcd.bank.balance(connectedWallet.walletAddress).then(([coins]) => {
                        let found = false;
                        coins.map((item) => {
                            if(item.denom === curr.denom){
                                setAmountAvailable(item.amount/1e6)
                                found = true;
                            }
                        });
                        if(found === false)
                            setAmountAvailable(0)
                    })
                }
            }
        })
    }

    const handleRadioButton = (e) => {
        setRefundType(e.target.value)
    }

    const handleButton = () => {
        if(amount === 0)
            setTxResult({status: 2, message: "Amount = 0"})
        else
            setTxResult({status: 1, message: ""})

        if (!connectedWallet) {
            setTxResult({status: 2, message: "Wallet not connected"})
            return;
        }

        if (connectedWallet.network.chainID.startsWith('phoenix')) {
            setTxResult({status: 2, message: "Wrong network"})
            return;
        }

        connectedWallet
            .post({
                fee: new Fee(1000000, '200000uusd'),
                msgs: [
                    new MsgSend(connectedWallet.walletAddress, CONTRACT_ADDRESS, {
                        uusd: 1000000,
                    }),
                ],
            })
            .then((nextTxResult) => {
                setTxResult({status: 1, message: ""});
            })
            .catch((error) => {
                if (error instanceof UserDenied) {
                    setTxResult({status: 2, message: "User Denied"})
                } else if (error instanceof CreateTxFailed) {
                    setTxResult({status: 2, message: 'Create Tx Failed: ' + error.message})
                } else if (error instanceof TxFailed) {
                    setTxResult({status: 2, message: 'Tx Failed: ' + error.message})
                } else if (error instanceof Timeout) {
                    setTxResult({status: 2, message: "Timeout"})
                } else if (error instanceof TxUnspecifiedError) {
                    setTxResult({status: 2, message: 'Unspecified Error: ' + error.message})
                } else {
                    setTxResult({status: 2, message: 'Unknown Error: ' + (error instanceof Error ? error.message : String(error))})
                }
            });
    }

    useEffect(() => {
        if(status === "WALLET_CONNECTED"){
            lcd.bank.balance(connectedWallet.walletAddress).then(([coins]) => {
                coins.map((item) => {
                    item.denom === currency.denom && setAmountAvailable(item.amount / 1e6)
                    setAmount(0)
                });
            })
        }
        else
            setAmountAvailable(0)
    }, [status, connectedWallet])

    return(
        <div className="mt-8">
            <div className="card border-2 border-gray-500 text-primary-content shadow-[0_0_60px_-10px] shadow-cyan-500">
                <div className="card-body p-6">
                    <p className="text-xl text-cyan-300 font-bold text-center uppercase mb-4">Donation</p>
                    {
                        status === WalletStatus.WALLET_CONNECTED && (
                            <div className="flex justify-between items-center">
                                <span className="caption text-sm md:text-xs text-gray-500 mt-4">Address: {truncate(connectedWallet.walletAddress)}</span>
                                <button className="btn btn-xs" onClick={disconnect}>Disconnect</button>
                            </div>
                        )
                    }

                    <div className="rounded-lg bg-gray-700 py-2 px-4 mb-4">
                        <div className="flex justify-between items-center">
                            <span className="caption text-sm md:text-sm text-gray-400">Currency</span>
                            <div className="flex items-center">
                                <span className="caption text-sm md:text-xs text-gray-400">Available:</span>
                                <span className="caption text-sm md:text-xs font-bold text-accent ml-1.5">{amountAvailable}</span>
                            </div>
                        </div>
                        <div className="flex items-center mt-3">
                            <div className="flex items-center justify-center mb-3">
                                <select className="select select-bordered" value={currency.name}  onChange={handleSelect}>
                                    {
                                        currencies.map((currency) => (
                                            <option value={currency.name} key={currency.name}>{currency.name}</option>
                                        ))
                                    }
                                </select>
                            </div>
                            <div className="flex-1"></div>
                            <input type="text"
                                   value={amount !== 0 ? amount : ""}
                                   onChange={updateAmount}
                                   pattern="^-?[0-9]\d*\.?\d*$"
                                   placeholder="0.0"
                                   min="0" maxLength="15"
                                   autoComplete="off" autoCorrect="off"
                                   className="input text-2xl text-right bg-transparent focus:outline-none"
                            />
                        </div>
                    </div>

                    <div className="px-4 mb-4">
                        <span className="text-gray-400">Refund Type</span>
                        <div className="mt-2">
                            {
                                refundAlgo && refundAlgo.length > 0 ? (
                                    refundAlgo.map((item) => (
                                        <div className="" key={item.value}>
                                            <label className="label cursor-pointer inline-flex items-center">
                                                <input type="radio"
                                                       value={item.value}
                                                       checked={ refundType === item.value}
                                                       onChange={handleRadioButton}
                                                       className="radio checked:bg-cyan-500"/>
                                                <span className="label-text ml-4 mr-2">{item.title}</span>
                                                <span  className="tooltip" data-tip={item.description}><RiInformationFill/></span>
                                            </label>
                                        </div>
                                    ))
                                ) : (
                                    <p className="text-xl font-bold">Nothing yet...</p>
                                )
                            }
                        </div>
                    </div>
                    {
                        txResult.status === 1 && (
                            <div className="alert alert-success shadow-lg max-w-600">
                                <div>
                                    <svg xmlns="http://www.w3.org/2000/svg" className="stroke-current flex-shrink-0 h-6 w-6"
                                         fill="none" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"
                                              d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
                                    </svg>
                                    <span>
                                        Thank you very much for your donation!
                                        <a
                                        href={`https://finder.terra.money/${connectedWallet.network.chainID}/tx/${txResult.result.txhash}`}
                                        target="_blank"
                                        rel="noreferrer"
                                        >
                                            Tx Hash
                                        </a>
                                    </span>
                                </div>
                            </div>
                        ) || txResult.status === 2 && (
                            <div className="alert alert-error shadow-lg max-w-600">
                                <div>
                                    <svg xmlns="http://www.w3.org/2000/svg"
                                         className="stroke-current flex-shrink-0 h-6 w-6" fill="none"
                                         viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"
                                              d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z"/>
                                    </svg>
                                    <span>Transaction error: {txResult.message}</span>
                                </div>
                            </div>
                        )
                    }

                    <div className="card-actions justify-center mt-4">
                        {
                            status === WalletStatus.WALLET_CONNECTED ? (
                                wrongAmount === true ? (
                                    <div className="alert alert-error shadow-lg justify-center">
                                        <svg xmlns="http://www.w3.org/2000/svg"
                                             className="stroke-current flex-shrink-0 h-6 w-6" fill="none"
                                             viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"
                                                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/>
                                        </svg>
                                        <span>Insufficient balance</span>
                                    </div>
                                ):  connectedWallet && !connectedWallet.network.chainID.startsWith('phoenix') ? (
                                    <div className="alert alert-error shadow-lg justify-center">
                                        <div>
                                            <svg xmlns="http://www.w3.org/2000/svg"
                                                 className="stroke-current flex-shrink-0 h-6 w-6" fill="none"
                                                 viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"
                                                      d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z"/>
                                            </svg>
                                            <span><strong>Wrong Wallet Network.</strong><br/>Change network and refresh</span>
                                        </div>
                                    </div>
                                ) : (
                                    <button className={`btn btn-accent ${amount  === 0 && "btn-disabled"} gap-2`} onClick={handleButton}>
                                        <span>Donate</span>
                                        <FaHeart/>
                                    </button>
                                )
                            ) : (
                                <>
                                    {
                                        /*JSON.stringify({ status, network, wallets }, null, 2)*/
                                        availableConnectTypes.map((connectType) => (
                                            connectType === "EXTENSION" && (
                                                <button
                                                    key={connectType}
                                                    onClick={() => connect(connectType)}
                                                    className="btn btn-accent gap-2"
                                                >
                                                    <img src={Wallet} alt="wallet" className="h-6"/>
                                                    <span>Connect Wallet</span>
                                                </button>
                                            )
                                        ))
                                    }
                                </>
                            )
                        }
                    </div>

                </div>
            </div>
        </div>
    )
}

export default Donation