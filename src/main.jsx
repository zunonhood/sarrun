import React, { useEffect, useState } from 'react'
import { createRoot } from 'react-dom/client'
import { address } from '@solana/kit'
import { ClientProvider, useClient } from '@solana/react'
import { useConnect, useConnectedWallet, useDisconnect, useWalletStatus, useWallets } from '@solana/kit-plugin-wallet/react'
import {
  ArrowRight, ArrowUpRight, ChevronDown, CircleHelp, Code2, Copy,
  EyeOff, FileCheck2, Fingerprint, KeyRound, Lock, LogOut, Menu, Network,
  Plus, Send, ShieldCheck, Sparkles, Wallet, X, Zap
} from 'lucide-react'
import './styles.css'
import { createPaymentAddress, downloadRecoveryRecord, exitPrivate, getProtocolConfig, scanReceivedNotes, shieldNative, transferPrivate } from './protocol.js'
import { solanaClient } from './solana-client.js'

const PROTOCOL = getProtocolConfig()
const BASE = import.meta.env.BASE_URL

const CHAIN = {
  chain: 'solana:mainnet',
  chainName: 'Solana',
  rpcUrl: 'https://api.mainnet.solana.com',
  nativeCurrency: { name: 'Solana', symbol: 'SOL', decimals: 9 },
  blockExplorerUrls: ['https://explorer.solana.com'],
}

const faqs = [
  ['What is Sarrun?', 'Sarrun is a non-custodial shielded account protocol for native SOL on Solana. It uses private note commitments and zero-knowledge proofs instead of a public account graph.'],
  ['Is Sarrun a mixer?', 'No. Sarrun is a persistent shielded account: users hold private notes and authorize transfers with zero-knowledge proofs rather than depositing into a fixed-denomination mixing round.'],
  ['Who controls my assets?', 'You do. One-time spending secrets are created on the user device. Sarrun never asks for a wallet seed phrase.'],
  ['How is value protected?', 'Every deposit is bound to its SOL value in the note commitment. Every private transition proves ownership, Merkle membership, value conservation and unused nullifiers.'],
  ['Which network does Sarrun use?', 'Sarrun targets Solana mainnet, mainnet-beta, with SOL as the native settlement asset and gas token.'],
  ['Is there a Sarrun token?', 'No verified Solana mint address is currently published. It must appear here and on @sarruncash before it should be treated as official.'],
  ['Is privacy absolute?', 'No. Sarrun hides the internal note graph, but timing, amounts, RPC metadata, public entry and public exit can still create correlations.'],
]
function Logo({ dark = false, markOnly = false }) {
  return (
    <a className={'logo ' + (dark ? 'logo-dark' : '')} href="#top" aria-label="Sarrun home">
      <span className="logo-mark"><img src={`${BASE}sarrun-logo-transparent.png`} alt="" /></span>
      {!markOnly && <span className="logo-word">sarrun</span>}
    </a>
  )
}

function Star({ className = '' }) {
  return <svg className={'star ' + className} viewBox="0 0 100 100"><path d="M50 4C53 32 66 46 96 50C66 54 53 68 50 96C47 68 34 54 4 50C34 46 47 32 50 4Z" /></svg>
}


function XBrand() {
  return <svg className="x-brand" viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24h-6.657l-5.214-6.817-5.967 6.817H1.68l7.724-8.835L1.254 2.25H8.08l4.713 6.231 5.45-6.231Zm-1.161 17.52h1.833L7.084 4.126H5.117L17.083 19.77Z"/></svg>
}

function GithubBrand() {
  return <svg className="github-brand" viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M12 .7C5.65.7.5 5.85.5 12.2c0 5.08 3.29 9.39 7.86 10.91.58.11.79-.25.79-.56v-2.16c-3.2.7-3.88-1.36-3.88-1.36-.52-1.33-1.28-1.68-1.28-1.68-1.05-.72.08-.7.08-.7 1.16.08 1.77 1.19 1.77 1.19 1.03 1.77 2.71 1.26 3.37.96.1-.75.4-1.26.73-1.55-2.56-.29-5.25-1.28-5.25-5.7 0-1.26.45-2.29 1.19-3.1-.12-.29-.52-1.47.11-3.06 0 0 .97-.31 3.17 1.18A11 11 0 0 1 12 6.18c.98 0 1.96.13 2.88.39 2.2-1.49 3.17-1.18 3.17-1.18.63 1.59.23 2.77.11 3.06.74.81 1.19 1.84 1.19 3.1 0 4.43-2.7 5.4-5.27 5.69.42.36.78 1.06.78 2.14v3.17c0 .31.21.67.8.56a11.51 11.51 0 0 0 7.84-10.91C23.5 5.85 18.35.7 12 .7Z"/></svg>
}
function Header({ openApp }) {
  const [menu, setMenu] = useState(false)
  return (
    <header className="site-header">
      <Logo />
      <nav className={menu ? 'site-nav open' : 'site-nav'}>
        <a href="#product" onClick={() => setMenu(false)}>Product</a>
        <a href="#privacy" onClick={() => setMenu(false)}>Privacy</a>
        <a href="#security" onClick={() => setMenu(false)}>Security</a>
        <a href="#developers" onClick={() => setMenu(false)}>Developers</a>
        <a href={`${BASE}docs.html#architecture`}>Architecture</a>
        <a href="#token" onClick={() => setMenu(false)}>Token</a>
        <a href={`${BASE}docs.html`}>Docs</a>
      </nav>
      <div className="header-end">
        <a className="chain-pill" href={CHAIN.blockExplorerUrls[0]} target="_blank" rel="noreferrer"><i />Solana</a>
        <a className="header-github" href={`${BASE}docs.html#repository`} aria-label="Browse protocol source"><GithubBrand /></a>
        <a className="header-fomo" href="https://fomo.family" target="_blank" rel="noreferrer" aria-label="Open Fomo trading app"><img src={`${BASE}fomo-logo.svg`} alt="" /></a>
        <a className="header-x" href="https://x.com/sarruncash" target="_blank" rel="noreferrer" aria-label="Follow Sarrun on X"><XBrand /></a>
        <a className="primary-btn light token-buy" href="https://pump.fun/" target="_blank" rel="noreferrer">Launch on Pump.fun <ArrowRight /></a>
        <button className="menu-btn" onClick={() => setMenu(!menu)} aria-label="Menu">{menu ? <X /> : <Menu />}</button>
      </div>
    </header>
  )
}

function ProductCard({ openApp }) {

  return (
    <div className="hero-product">
      <div className="note-sticker">your shielded account</div>
      <div className="account-preview">
        <div className="preview-head">
          <span className="anon-avatar"><Lock /></span>
          <div><small>SHIELDED ACCOUNT</small><b>Solana</b></div>
          <span className="preview-privacy" aria-label="Balance concealed"><EyeOff /></span>
        </div>
        <div className="preview-balance">
          <small>SHIELDED BALANCE</small>
          <strong>•••• SOL</strong>
          <span><i /> no public account balance</span>
        </div>
        <div className="preview-actions">
          <button onClick={openApp}><span><Plus /></span>Shield</button>
          <button onClick={openApp}><span><Send /></span>Transfer</button>
          <button onClick={openApp}><span><ArrowUpRight /></span>Exit</button>
        </div>
        <div className="preview-rule" />
        <div className="preview-row"><span className="asset-icon solana-chain"><img src={`${BASE}solana-mark.svg`} alt="" /></span><div><b>SOL on Solana</b><small>NATIVE GAS ASSET · MAINNET-BETA</small></div></div>
        <div className="preview-row"><span className="asset-icon proof"><ShieldCheck /></span><div><b>Private transfers</b><small>ZERO-KNOWLEDGE AUTHORIZATION</small></div></div>
      </div>
      <div className="privacy-seal" aria-label="Spending keys stay on your device"><KeyRound /><b>Keys stay<br />local</b></div>
      <Star className="hero-star" />
    </div>
  )
}
function Hero({ openApp }) {
  return (
    <section className="hero" id="top">
      <Header openApp={openApp} />
      <img className="hero-art" src={`${BASE}sarrun-banner.png`} alt="" />
      <div className="hero-copy">
        <span className="hand-label">✦ privacy without the poker face</span>
        <h1>Your money is<br /><em>none of the internet’s business.</em></h1>
        <p>A non-custodial shielded account protocol for Solana. Shield, transfer and exit SOL without publishing your private note graph.</p>
        <div className="hero-ctas">
          <button className="primary-btn green" onClick={openApp}>Launch app <ArrowRight /></button>
          <a href={`${BASE}docs.html#architecture`} className="secondary-link"><span><Sparkles /></span>Explore docs &amp; code</a>
        </div>
      </div>
      <ProductCard openApp={openApp} />
      <div className="trust-strip">
        <span><Lock />Non-custodial</span><span><Network />Permissionless</span>
        <span><Code2 />Inspectable core</span><span><Zap />Built for Solana</span>
      </div>
    </section>
  )
}

const pillars = [
  { icon: Fingerprint, n: '01', title: 'Value-bound notes', text: 'Every public SOL deposit is cryptographically bound to one private commitment.', meta: ['BINDS', 'ASSET · VALUE · OWNER'] },
  { icon: Send, n: '02', title: 'Private transfers', text: 'Move value between private notes using a zero-knowledge proof instead of publishing the ownership graph.', meta: ['HIDES', 'AMOUNTS · OWNERSHIP LINKS'] },
  { icon: ShieldCheck, n: '03', title: 'Verified settlement', text: 'The chain verifies membership, authorization, nullifiers and value conservation before state changes.', meta: ['CHECKS', 'ROOTS · NULLIFIERS · VALUE'] },
]
function ProductSection() {
  return (
    <section className="product-section" id="product">
      <div className="section-intro">
        <div><span className="eyebrow">THE PRODUCT</span><h2>Financial privacy,<br />without disappearing.</h2></div>
        <p>Sarrun keeps the note graph private while Solana verifies that every state transition follows the protocol rules.</p>
      </div>
      <div className="pillar-grid">
        {pillars.map(({ icon: Icon, n, title, text, meta }) => (
          <article className="pillar" key={n}>
            <div className="pillar-top"><span>{n}</span><Icon /></div>
            <h3>{title}</h3><p>{text}</p>
            <div className="pillar-meta"><span>{meta[0]}</span><b>{meta[1]}</b></div>
          </article>
        ))}
      </div>
    </section>
  )
}

function FlowSection() {
  const steps = [
    ['Connect', 'Use an Solana wallet on Solana for public settlement.'],
    ['Shield', 'Bind public SOL to a private note commitment.'],
    ['Transfer', 'Move value between private notes with a zero-knowledge proof.'],
    ['Exit', 'Prove a valid spend and return SOL to a public recipient.'],
  ]
  return (
    <section className="flow-section" id="privacy">
      <div className="flow-title"><span className="eyebrow green-text">HOW IT WORKS</span><h2>Public in.<br />Private inside.<br /><em>Verified out.</em></h2></div>
      <div className="flow-list">
        {steps.map(([title, text], i) => <article key={title}><span>0{i + 1}</span><div><h3>{title}</h3><p>{text}</p></div>{i < 3 && <ArrowRight />}</article>)}
      </div>
    </section>
  )
}

function PrivacyMap() {
  return (
    <section className="map-section">
      <div className="map-title"><span className="eyebrow">CLEAR BY DESIGN</span><h2>Private does not mean vague.</h2><p>Sarrun separates what the public chain needs to verify from what belongs to the user.</p></div>
      <div className="map-grid">
        <div className="map-card private-card">
          <span><EyeOff />NOT EXPOSED ONCHAIN</span>
          <ul><li>Shielded balance</li><li>Internal transfer amounts</li><li>Internal sender / recipient link</li><li>Note ownership graph</li></ul>
        </div>
        <div className="map-center"><div className="keyhole-shape"><i /><b /></div><small>ZERO-KNOWLEDGE<br />PROOF</small></div>
        <div className="map-card public-card">
          <span><ShieldCheck />VERIFIABLE ONCHAIN</span>
          <ul><li>State transition is valid</li><li>Public entry and exit values</li><li>No note is spent twice</li><li>Assets are conserved</li></ul>
        </div>
      </div>
    </section>
  )
}

function SecuritySection() {
  const items = [
    ['Keys stay local', 'One-time spending secrets are generated on the user device and never sent to the pool contract.'],
    ['Value bound at entry', 'The contract derives each deposit commitment from the exact SOL value supplied in the transaction.'],
    ['Proof before state', 'Private transfers must prove membership, ownership, amount ranges and value conservation before execution.'],
    ['Limits stay explicit', 'Public entry, public exit, timing and network metadata remain part of the documented threat model.'],
  ]
  return (
    <section className="security-section" id="security">
      <div className="security-head"><span className="eyebrow green-text">SECURITY MODEL</span><h2>Know what protects you.</h2><p>Privacy claims are only useful when their assumptions are explicit.</p></div>
      <div className="security-list">{items.map(([t, p], i) => <article key={t}><span>0{i + 1}</span><div><h3>{t}</h3><p>{p}</p></div></article>)}</div>
    </section>
  )
}


function TokenSection() {
  return (
    <section className="token-section" id="token">
      <div className="token-copy">
        <span className="eyebrow">SARRUN TOKEN</span>
        <h2>Pump.fun launch.<br /><em>One official mint.</em></h2>
        <p>SARRUN will launch on Pump.fun. Until the verified mint address appears here and on <a href="https://x.com/sarruncash" target="_blank" rel="noreferrer">@sarruncash</a>, assume every token using our name is unrelated.</p>
      </div>
      <div className="token-console">
        <div className="token-ca"><span>VERIFIED MINT ADDRESS</span><strong>NOT PUBLISHED</strong><small>Solana · Mint address will be announced here</small></div>
        <div className="token-links">
          <a href="https://pump.fun/" target="_blank" rel="noreferrer"><span>PUMP.FUN</span><b>Launchpad</b><ArrowUpRight /></a>
          <a href="https://fomo.family" target="_blank" rel="noreferrer"><span>FOMO</span><b>Trading app</b><ArrowUpRight /></a>
        </div>
        <p><Lock /> These are platform homepages, not SARRUN trading pairs. Token-specific links will only activate after the verified mint is published here and on @sarruncash.</p>
      </div>
    </section>
  )
}
function DeveloperSection() {
  return (
    <section className="developer-section" id="developers">
      <img src={`${BASE}sarrun-banner.png`} alt="" />
      <div className="dev-content">
        <span className="eyebrow green-text">BUILDING IN PUBLIC</span>
        <h2>Privacy needs<br /><em>more builders.</em></h2>
        <p>We are four people working in the open across zero-knowledge circuits, contracts, wallets and protocol security.</p>
        <div className="dev-stack"><span>Circom</span><span>Rust / sBPF</span><span>Groth16</span><span>JavaScript SDK</span></div>
        <div className="dev-actions"><a className="primary-btn green" href={`${BASE}docs.html`}><Code2 />Read the docs</a><a className="primary-btn outline" href="https://x.com/sarruncash" target="_blank" rel="noreferrer">Follow @sarruncash <ArrowUpRight /></a></div>
      </div>
      <div className="dev-note">hard problem?<br /><b>good.</b></div>
    </section>
  )
}

function FAQ() {
  const [open, setOpen] = useState(0)
  return (
    <section className="faq-section" id="faq">
      <div className="faq-head"><span className="eyebrow">QUESTIONS, ANSWERED</span><h2>Read this before<br />you enter the shield.</h2></div>
      <div className="faq-list">{faqs.map(([q, a], i) => <article className={open === i ? 'open' : ''} key={q}><button onClick={() => setOpen(open === i ? -1 : i)}><span>{q}</span><i>{open === i ? '−' : '+'}</i></button><div><p>{a}</p></div></article>)}</div>
    </section>
  )
}

function Footer() {
  return (
    <footer>
      <div className="footer-main"><Logo /><p>Your money is none of<br />the internet’s business.</p><div><a href="#product">Product</a><a href="#security">Security</a><a href="#token">Token</a><a href={`${BASE}docs.html`}>Docs</a><a href="https://x.com/sarruncash" target="_blank" rel="noreferrer">X ↗</a></div></div>
      <div className="footer-bottom"><span>© 2026 Sarrun</span><span>Non-custodial privacy infrastructure for Solana.</span><a href={CHAIN.blockExplorerUrls[0]} target="_blank" rel="noreferrer">Mainnet explorer <ArrowUpRight /></a></div>
    </footer>
  )
}

function AppShell({ close }) {
  const client = useClient()
  const walletStatus = useWalletStatus(client)
  const wallets = useWallets(client)
  const connected = useConnectedWallet(client)
  const connectAction = useConnect(client)
  const disconnectAction = useDisconnect(client)
  const account = connected?.account.address || ''
  const connecting = walletStatus === 'connecting' || connectAction.isRunning
  const [balance, setBalance] = useState('')
  const [error, setError] = useState('')
  const [activeTab, setActiveTab] = useState('account')
  const [action, setAction] = useState('')
  const [busy, setBusy] = useState(false)
  const [progress, setProgress] = useState('')
  const [shieldAmount, setShieldAmount] = useState('')
  const [transferAmount, setTransferAmount] = useState('')
  const [paymentAddress, setPaymentAddress] = useState('')
  const [exitAmount, setExitAmount] = useState('')
  const [exitRecipient, setExitRecipient] = useState('')
  const [recovery, setRecovery] = useState(null)
  const [receiverRecovery, setReceiverRecovery] = useState(null)
  const [receivedNotes, setReceivedNotes] = useState([])
  const [importError, setImportError] = useState('')

  const refreshBalance = async (walletAddress = account) => {
    if (!walletAddress) return
    const result = await client.rpc.getBalance(address(walletAddress), { commitment: 'confirmed' }).send()
    setBalance((Number(result.value) / 1e9).toLocaleString(undefined, { maximumFractionDigits: 5 }))
  }

  const importRecovery = async (event) => {
    const file = event.target.files?.[0]
    if (!file) return
    setImportError('')
    try {
      const record = JSON.parse(await file.text())
      if (record?.version !== 1 || record.cluster !== 'mainnet-beta') throw new Error('This is not a valid Solana mainnet Sarrun record.')
      if (record.kind === 'sarrun-receiver' && record.address && record.ownerSecret && record.viewingPrivateKey) {
        setReceiverRecovery(record)
      } else if (record.kind === 'sarrun-note' && record.note && record.ownerSecret && record.pool) {
        setRecovery(record)
      } else {
        throw new Error('This Sarrun record is incomplete or unsupported.')
      }
    } catch (e) {
      setImportError(e?.message || 'The recovery file could not be opened.')
    } finally { event.target.value = '' }
  }

  const connectWallet = async () => {
    setError('')
    try {
      const preferred = wallets.find(wallet => wallet.name.toLowerCase().includes('phantom')) || wallets[0]
      if (!preferred) throw new Error('No Solana wallet found. Install Phantom or another Wallet Standard wallet.')
      await connectAction.dispatchAsync(preferred)
    } catch (e) { setError(e?.message || 'Wallet connection failed.') }
  }

  const disconnectWallet = async () => {
    setError('')
    try { await disconnectAction.dispatchAsync() } catch {}
    setBalance(''); setAction(''); setProgress('')
  }

  const handleShield = async (event) => {
    event.preventDefault(); setBusy(true); setError(''); setProgress('signing')
    try {
      const result = await shieldNative({ client, wallet: connected, amount: shieldAmount, onPrepared: record => { setRecovery(record); downloadRecoveryRecord(record) } })
      setRecovery({ ...result.record }); setAction('complete'); setProgress(''); await refreshBalance()
    } catch (e) { setError(e?.shortMessage || e?.message || 'Shield transaction failed.') }
    finally { setBusy(false) }
  }

  const handleTransfer = async (event) => {
    event.preventDefault(); setBusy(true); setError('')
    try {
      if (!recovery) throw new Error('Import a spendable note recovery record first.')
      const result = await transferPrivate({
        client, wallet: connected, recovery, amount: transferAmount, paymentAddress,
        onProof: setProgress,
        onPrepared: record => { if (record) downloadRecoveryRecord(record) },
      })
      setRecovery(result.changeRecord); setAction('complete'); setProgress('')
    } catch (e) { setError(e?.shortMessage || e?.message || 'Private transfer failed.') }
    finally { setBusy(false) }
  }

  const handleExit = async (event) => {
    event.preventDefault(); setBusy(true); setError('')
    try {
      if (!recovery) throw new Error('Import a spendable note recovery record first.')
      const result = await exitPrivate({
        client, wallet: connected, recovery, amount: exitAmount, recipientAddress: exitRecipient,
        onProof: setProgress,
        onPrepared: record => { if (record) downloadRecoveryRecord(record) },
      })
      setRecovery(result.changeRecord); setAction('complete'); setProgress(''); await refreshBalance()
    } catch (e) { setError(e?.shortMessage || e?.message || 'Public exit failed.') }
    finally { setBusy(false) }
  }

  const createReceiver = async () => {
    setBusy(true); setImportError('')
    try {
      const created = await createPaymentAddress()
      setReceiverRecovery(created.recovery)
      downloadRecoveryRecord(created.recovery)
    } catch (e) { setImportError(e?.message || 'Could not create a private receiving address.') }
    finally { setBusy(false) }
  }

  const scanNotes = async () => {
    setBusy(true); setImportError('')
    try {
      if (!receiverRecovery) throw new Error('Create or import a receiver record first.')
      const found = await scanReceivedNotes({ client, wallet: connected, receiverRecovery })
      setReceivedNotes(found)
      const spendable = found.find(item => !item.spent)
      if (spendable) setRecovery(spendable.record)
    } catch (e) { setImportError(e?.message || 'Could not scan encrypted notes.') }
    finally { setBusy(false) }
  }

  useEffect(() => {
    if (account) refreshBalance(account).catch(() => setBalance(''))
    else setBalance('')
  }, [account])

  const progressLabel = progress === 'proving' ? 'Generating proof…' : progress === 'signing' ? 'Awaiting signature…' : progress === 'confirming' ? 'Confirming…' : 'Submit transaction'

  return (
    <div className="app-shell">
      <header className="app-header"><Logo dark /><a href={CHAIN.blockExplorerUrls[0]} target="_blank" rel="noreferrer" className="app-network"><i />Solana</a><button onClick={close}><X /></button></header>
      <aside className="app-side">
        <button className={activeTab === 'account' ? 'active' : ''} onClick={() => setActiveTab('account')}><Wallet />Account</button>
        <button className={activeTab === 'activity' ? 'active' : ''} onClick={() => setActiveTab('activity')}><Send />Activity</button>
        <button className={activeTab === 'recovery' ? 'active' : ''} onClick={() => setActiveTab('recovery')}><FileCheck2 />Recovery</button>
        <button className={activeTab === 'help' ? 'active' : ''} onClick={() => setActiveTab('help')}><CircleHelp />Help</button>
      </aside>
      <main className="app-content">
        {activeTab === 'account' && (!account ? (
          <div className="connect-state">
            <div className="connect-mark"><Logo markOnly /><Star /></div>
            <span className="eyebrow">WELCOME TO SARRUN</span>
            <h1>Your private account<br />starts with your wallet.</h1>
            <p>Connect an Solana wallet to use Sarrun on Solana. Sarrun never asks for your wallet seed phrase.</p>
            <button className="primary-btn green" onClick={connectWallet} disabled={connecting}><Wallet />{connecting ? 'Connecting…' : 'Connect wallet'}</button>
            {error && <div className="wallet-error">{error}</div>}
            <small><Lock />Non-custodial connection</small>
          </div>
        ) : (
          <div className="connected-state">
            <div className="connected-head"><div><span className="eyebrow">CONNECTED ACCOUNT</span><h1>Your Sarrun account.</h1></div><div className="connected-controls"><button className="address-chip" onClick={() => navigator.clipboard?.writeText(account)}>{account.slice(0,6)}…{account.slice(-4)} <Copy /></button><button className="disconnect-wallet" onClick={disconnectWallet}><LogOut />Disconnect</button></div></div>
            <div className="account-grid">
              <section className="main-balance"><span>PUBLIC WALLET BALANCE</span><strong>{balance} SOL</strong><small><i />Solana mainnet</small><div><button onClick={() => { setAction('shield'); setError('') }}><Plus />Shield SOL</button><button onClick={() => { setAction('transfer'); setError('') }}><Send />Send privately</button><button onClick={() => { setAction('exit'); setError('') }}><ArrowUpRight />Exit to wallet</button></div></section>
              <section className="shield-status"><ShieldCheck /><span>SHIELDED ACCOUNT</span><h2>{recovery ? 'Spendable note loaded' : 'Private state'}</h2><p>{recovery ? 'A local recovery record is ready to authorize a private transfer or public exit.' : 'Import a note recovery record or shield SOL to create private state.'}</p><b><Lock />Keys remain local</b></section>
            </div>
            {action === 'shield' && <form className="protocol-action" onSubmit={handleShield}><div><span>SHIELD SOL</span><h3>Move value into your private account.</h3><p>The deposit amount is public. The resulting spending secret is generated locally.</p></div><label><span>AMOUNT</span><div><input type="number" min="0" step="0.000001" placeholder="0.00" value={shieldAmount} onChange={event => setShieldAmount(event.target.value)} required /><b>SOL</b></div></label><button className="primary-btn green" disabled={busy}>{busy ? progressLabel : 'Shield assets'} <ArrowRight /></button><button type="button" className="action-close" onClick={() => setAction('')}><X /></button></form>}
            {action === 'transfer' && <form className="protocol-action two-fields" onSubmit={handleTransfer}><div><span>PRIVATE TRANSFER</span><h3>Send to a Sarrun address.</h3><p>The recipient’s encrypted note is published with the proof. A change recovery file is downloaded before signing.</p></div><label><span>AMOUNT</span><div><input type="number" min="0" step="0.000001" placeholder="0.00" value={transferAmount} onChange={event => setTransferAmount(event.target.value)} required /><b>SOL</b></div></label><label><span>SARRUN ADDRESS</span><div><input type="text" placeholder="sarrun:sol:1:…" value={paymentAddress} onChange={event => setPaymentAddress(event.target.value.trim())} required /></div></label><button className="primary-btn green" disabled={busy}>{busy ? progressLabel : 'Generate proof'} <ArrowRight /></button><button type="button" className="action-close" onClick={() => setAction('')}><X /></button></form>}
            {action === 'exit' && <form className="protocol-action two-fields" onSubmit={handleExit}><div><span>PUBLIC EXIT</span><h3>Exit SOL to a public wallet.</h3><p>The exit amount and recipient become public. Any private change remains protected by a new note.</p></div><label><span>AMOUNT</span><div><input type="number" min="0" step="0.000001" placeholder="0.00" value={exitAmount} onChange={event => setExitAmount(event.target.value)} required /><b>SOL</b></div></label><label><span>RECIPIENT</span><div><input type="text" placeholder="Solana address…" value={exitRecipient} onChange={event => setExitRecipient(event.target.value.trim())} required /></div></label><button className="primary-btn green" disabled={busy}>{busy ? progressLabel : 'Generate proof'} <ArrowRight /></button><button type="button" className="action-close" onClick={() => setAction('')}><X /></button></form>}
            {action === 'complete' && <div className="protocol-action complete"><ShieldCheck /><div><span>TRANSACTION CONFIRMED</span><h3>Your private state is updated.</h3><p>{recovery ? 'The new recovery file controls your remaining private change.' : 'The selected note was fully spent and has no private change.'}</p></div>{recovery && <button className="primary-btn outline" onClick={() => downloadRecoveryRecord(recovery)}>Download again</button>}</div>}
            {error && <div className="wallet-error action-error">{error}</div>}
            <div className={'deployment-notice ' + (PROTOCOL.configured && PROTOCOL.provingReady ? 'is-ready' : 'needs-address')}><Sparkles /><div><b>{PROTOCOL.configured && PROTOCOL.provingReady ? 'Verified protocol connection' : 'Production activation required'}</b><p>{PROTOCOL.configured && PROTOCOL.provingReady ? `Every action is routed to ${PROTOCOL.address.slice(0, 6)}…${PROTOCOL.address.slice(-4)} on Solana.` : 'Transactions remain locked until verified contracts and production proving artifacts are published in the deployment manifest.'}</p></div></div>
          </div>
        ))}

        {activeTab === 'activity' && <section className="app-panel"><div className="app-panel-head"><span className="eyebrow">ACTIVITY</span><h1>Public settlement.<br />Private context.</h1><p>Public wallet activity is visible on Solana. Encrypted private notes are discovered and decrypted locally.</p></div><div className="app-panel-grid"><article className="app-info-card"><Network /><span>PUBLIC ACCOUNT</span><h2>{account ? `${account.slice(0, 8)}…${account.slice(-6)}` : 'No wallet connected'}</h2><p>{account ? 'Inspect deposits, exits and gas payments in the public explorer.' : 'Connect your wallet to inspect public settlement history.'}</p>{account ? <a className="panel-link" href={`${CHAIN.blockExplorerUrls[0]}/address/${account}`} target="_blank" rel="noreferrer">Open explorer <ArrowUpRight /></a> : <button className="panel-link" onClick={() => setActiveTab('account')}>Connect wallet <ArrowRight /></button>}</article><article className="app-info-card dark"><EyeOff /><span>PRIVATE NOTES</span><h2>{receivedNotes.length ? `${receivedNotes.filter(item => !item.spent).length} spendable note(s)` : recovery ? '1 note loaded locally' : 'No notes loaded'}</h2><p>Private activity is reconstructed from recovery records and encrypted output events—not from a public account graph.</p><button className="panel-link" onClick={() => setActiveTab('recovery')}>Open recovery <ArrowRight /></button></article></div></section>}

        {activeTab === 'recovery' && <section className="app-panel"><div className="app-panel-head"><span className="eyebrow">RECOVERY & RECEIVE</span><h1>Your keys stay local.</h1><p>Create a one-time Sarrun receiving address, scan encrypted output events, or restore an existing note. Receiver files and note files contain spending authority.</p></div><div className="receive-grid"><article className="receive-card"><KeyRound /><span>PRIVATE RECEIVING ADDRESS</span><h2>{receiverRecovery ? 'Address ready' : 'Create a one-time address'}</h2><p>Share the address, not the downloaded receiver file. The file is required to discover and spend incoming notes.</p>{receiverRecovery && <button className="address-output" onClick={() => navigator.clipboard?.writeText(receiverRecovery.address)}>{receiverRecovery.address.slice(0, 28)}… <Copy /></button>}<div><button onClick={createReceiver} disabled={busy}>{receiverRecovery ? 'Create another' : 'Create address'}</button>{receiverRecovery && <button onClick={scanNotes} disabled={busy}>{busy ? 'Scanning…' : 'Scan notes'}</button>}</div></article><article className="recovery-panel compact"><FileCheck2 /><div><span>IMPORT LOCAL RECORD</span><h2>{recovery ? 'Spendable note loaded' : receiverRecovery ? 'Receiver record loaded' : 'Choose a Sarrun JSON file'}</h2><p>The file is parsed in this browser and is never uploaded.</p></div><input id="recovery-file" type="file" accept="application/json,.json" onChange={importRecovery} /><label htmlFor="recovery-file">Choose file <ArrowRight /></label></article></div>{importError && <div className="wallet-error action-error">{importError}</div>}{receivedNotes.length > 0 && <div className="note-list">{receivedNotes.map((item, index) => <article key={`${item.record.transactionHash}-${index}`} className={item.spent ? 'spent' : ''}><div><span>ENCRYPTED NOTE</span><b>{item.spent ? 'Spent' : 'Spendable'}</b></div><code>{item.record.transactionHash?.slice(0, 18)}…</code><button disabled={item.spent} onClick={() => { setRecovery(item.record); downloadRecoveryRecord(item.record) }}>{item.spent ? 'Already spent' : 'Use & download'}</button></article>)}</div>}{recovery && <div className="recovery-summary"><div><span>NETWORK</span><b>Solana · mainnet-beta</b></div><div><span>NOTE</span><b>{String(recovery.note).slice(0, 12)}…{String(recovery.note).slice(-8)}</b></div><div><span>SOURCE TX</span><b>{recovery.transactionHash ? `${recovery.transactionHash.slice(0, 12)}…${recovery.transactionHash.slice(-8)}` : 'Prepared locally'}</b></div><button onClick={() => downloadRecoveryRecord(recovery)}>Download a copy</button></div>}</section>}

        {activeTab === 'help' && <section className="app-panel"><div className="app-panel-head"><span className="eyebrow">HOW SARRUN WORKS</span><h1>Three actions.<br />One private state.</h1><p>Sarrun hides the internal note ownership graph. It does not hide RPC metadata, timing, or the public entry and exit transactions.</p></div><div className="help-steps"><article><b>01</b><div><h2>Shield</h2><p>Deposit SOL from a public wallet. Save the recovery file before signing.</p></div></article><article><b>02</b><div><h2>Transfer</h2><p>Send to a one-time Sarrun address. The receiver discovers the encrypted note using their local receiver file.</p></div></article><article><b>03</b><div><h2>Exit</h2><p>Spend a note to a public address. The recipient and amount are visible onchain.</p></div></article></div><div className="panel-actions"><a className="primary-btn green" href={`${BASE}docs.html`}>Read documentation <ArrowRight /></a><a className="primary-btn outline" href="https://x.com/sarruncash" target="_blank" rel="noreferrer">Ask on X <ArrowUpRight /></a></div></section>}
      </main>
    </div>
  )
}
function App() {
  const [appOpen, setAppOpen] = useState(new URLSearchParams(window.location.search).get('app') === '1')
  useEffect(() => { if (window.location.hash) requestAnimationFrame(() => document.querySelector(window.location.hash)?.scrollIntoView()) }, [])
  useEffect(() => { document.body.style.overflow = appOpen ? 'hidden' : ''; return () => { document.body.style.overflow = '' } }, [appOpen])
  return <>
    <div className="page"><Hero openApp={() => setAppOpen(true)} /><ProductSection /><FlowSection /><PrivacyMap /><SecuritySection /><TokenSection /><DeveloperSection /><FAQ /><Footer /></div>
    {appOpen && <AppShell close={() => setAppOpen(false)} />}
  </>
}

createRoot(document.getElementById('root')).render(<ClientProvider client={solanaClient}><App /></ClientProvider>)
