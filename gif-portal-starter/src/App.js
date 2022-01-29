import React, { useEffect, useState } from 'react';
import twitterLogo from './assets/twitter-logo.svg';
import './App.css';
import idl from './myepicproject.json';
import { Connection, PublicKey, clusterApiUrl } from '@solana/web3.js';
import { Program, Provider, web3 } from '@project-serum/anchor';
import { publicKey } from '@project-serum/anchor/dist/cjs/utils';
import kp from './.keypair.json';

// Constants
// SystemProgram is a reference to the Solana runtime!
const { SystemProgram, Keypair } = web3;

// Create a keypair for the account that will hold the GIF data.
const arr = Object.values(kp._keypair.secretKey);
const secret = new Uint8Array(arr);
const baseAccount = web3.Keypair.fromSecretKey(secret);


// Get our program's id from the IDL file.
const programID = new PublicKey(idl.metadata.address);

// Set our network to devnet.
const network = clusterApiUrl('devnet');

// Controls how we want to acknowledge when a transaction is "done".
const opts = { preflightCommitment: "processed" };
 
const TWITTER_HANDLE = 'gotj25';
const TWITTER_LINK = `https://twitter.com/${TWITTER_HANDLE}`;
const TEST_GIFS = [
	'https://media3.giphy.com/media/L71a8LW2UrKwPaWNYM/giphy.gif?cid=ecf05e47rr9qizx2msjucl1xyvuu47d7kf25tqt2lvo024uo&rid=giphy.gif&ct=g',
  'https://im5.ezgif.com/tmp/ezgif-5-22202abfd7.webp',
  'https://i.giphy.com/media/eIG0HfouRQJQr1wBzz/giphy.webp',
  'https://im5.ezgif.com/tmp/ezgif-5-29280c0245.webp',
  'https://im5.ezgif.com/tmp/ezgif-5-0f48bea689.webp',
  'https://im5.ezgif.com/tmp/ezgif-5-eb4d061955.webp'
]

const App = () => {

const [walletAddress, setWalletAddress] = useState(null);
const [inputValue, setInputValue] = useState('');
const [gifList, setGifList] = useState([]);

/*
* This function holds the logic for deciding if a Phantom Wallet is
* connected or not
*/
const checkIfWalletIsConnected = async () => {
  try {
    const { solana } = window;

    if (solana) {
      if (solana.isPhantom) {
        console.log('Phantom wallet found!');

        /*
         * The solana object gives us a function that will allow us to connect
         * directly with the user's wallet!
         */
        const response = await solana.connect({ onlyIfTrusted: true });
        console.log(
          'Connected with Public Key:',
          response.publicKey.toString()
        );
        setWalletAddress(response.publicKey.toString());
      }
    } else {
      alert('Solana object not found! Get a Phantom Wallet 👻');
    }
  } catch (error) {
    console.error(error);
  }
};

/*
  * Let's define this method so our code doesn't break.
  * We will write the logic for this next!
  */
const connectWallet = async () => {
  const { solana } = window;

  if (solana) {
    const response = await solana.connect();
    console.log('Connected with Public Key:', response.publicKey.toString());
    setWalletAddress(response.publicKey.toString());
  }
};

const sendGif = async () => {
  if (inputValue.length === 0) {
    console.log("No gif link given!")
    return
  }
  setInputValue('');
  console.log('Gif link:', inputValue);
  try {
    const provider = getProvider();
    const program = new Program(idl, programID, provider);

    await program.rpc.addGif(inputValue, {
      accounts: {
        baseAccount: baseAccount.publicKey,
        user: provider.wallet.publicKey,
      },
    });
    console.log("GIF successfully sent to program", inputValue)

    await getGifList();
  } catch (error) {
    console.log("Error sending GIF:", error)
  }
};

const onInputChange = (event) => {
  const { value } = event.target;
  setInputValue(value);
};

const getProvider = () => {
  const connection = new Connection(network, opts.preflightCommitment);
  const provider = new Provider(
    connection, window.solana, opts.preflightCommitment,
  );
  return provider;
}

const createGifAccount = async () => {
  try {
    const provider = getProvider();
    const program = new Program(idl, programID, provider);
    console.log("ping")
    await program.rpc.startStuffOff({
      accounts: {
        baseAccount: baseAccount.publicKey,
        user: provider.wallet.publicKey,
        systemProgram: SystemProgram.programId,
      },
      signers: [baseAccount]
    });
    console.log("Created a new BaseAccount w/ address:", baseAccount.publicKey.toString())
    await getGifList();

  } catch(error) {
    console.log("Error creating BaseAccount account:", error)
  }
}

/*
  * We want to render this UI when the user hasn't connected
  * their wallet to our app yet.
  */
const renderNotConnectedContainer = () => (
  <button
    className="cta-button connect-wallet-button"
    onClick={connectWallet}
  >
    Connect to Wallet
  </button>
);

/*
* When our component first mounts, let's check to see if we have a connected
* Phantom Wallet
*/
useEffect(() => {
 const onLoad = async () => {
   await checkIfWalletIsConnected();
 };
 window.addEventListener('load', onLoad);
 return () => window.removeEventListener('load', onLoad);
}, []);

const getGifList = async() => {
  try {
    const provider = getProvider();
    const program = new Program(idl, programID, provider);
    const account = await program.account.baseAccount.fetch(baseAccount.publicKey);
    
    console.log("Got the account", account)
    setGifList(account.gifList)

  } catch (error) {
    console.log("Error in getGifList: ", error)
    setGifList(null);
  }
}

useEffect(() => {
  if (walletAddress) {
    console.log('Fetching GIF list...');
    getGifList()
  }
}, [walletAddress]);

const renderConnectedContainer = () => {
  // If we hit this, it means the program account hasn't been initialized.
    if (gifList === null) {
      return (
        <div className="connected-container">
          <button className="cta-button submit-gif-button" onClick={createGifAccount}>
            Do One-Time Initialization For GIF Program Account
          </button>
        </div>
      )
    } 
    // Otherwise, we're good! Account exists. User can submit GIFs.
    else {
      return(
        <div className="connected-container">
          <form
            onSubmit={(event) => {
              event.preventDefault();
              sendGif();
            }}
          >
            <input
              type="text"
              placeholder="Enter gif link!"
              value={inputValue}
              onChange={onInputChange}
            />
            <button type="submit" className="cta-button submit-gif-button">
              Submit
            </button>
            
          </form>
          <div className="gif-grid">
            {/* We use index as the key instead, also, the src is now item.gifLink */}
            {gifList.map((item, index) => (
              <div className="gif-item" key={index}>
                <img src={item.gifLink} />
                <p className="sub-text2">
                  ✨ Owner of GIF above is: {item.userAddress.toString()}✨
                </p>
                
              </div>
            ))}
          </div>
        </div>
      )
    }
  }

return (
  <div className="App">
    {/* This was solely added for some styling fanciness */}
    <div className={walletAddress ? 'authed-container' : 'container'}>
      <div className="header-container">
        <p className="header">🖼 GIF Portal BuildSpace+Surf</p>
        <p className="sub-text">
          View your GIF collection in the metaverse ✨
        </p>
        {/* Add the condition to show this only if we don't have a wallet address */}
        {walletAddress ? renderConnectedContainer() : renderNotConnectedContainer()}
      </div>
      <div className="footer-container">
        <img alt="Twitter Logo" className="twitter-logo" src={twitterLogo} />
        <a
          className="footer-text"
          href={TWITTER_LINK}
          target="_blank"
          rel="noreferrer"
        >{`built on @${TWITTER_HANDLE}`}</a>
      </div>
    </div>
  </div>
);
};

export default App;
